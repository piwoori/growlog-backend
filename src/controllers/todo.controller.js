// src/controllers/todo.controller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * YYYY-MM-DD 문자열을 해당 날짜의 [start, end) 범위로 변환
 */
const getDateRange = (dateString) => {
  const base = dateString ? new Date(dateString) : new Date();
  if (isNaN(base.getTime())) return null;

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

// ✅ 할 일 등록 (선택한 날짜 기준으로 생성)
exports.createTodo = async (req, res) => {
  const { content, date } = req.body; // ⭐ date 추가
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ error: "할 일 내용은 필수입니다." });
  }

  try {
    // ⭐ 날짜 처리: 없으면 오늘, 형식이 이상하면 오늘
    let createdAt = new Date();
    if (date) {
      const range = getDateRange(date);
      if (!range) {
        return res.status(400).json({
          error: "날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식으로 보내주세요.",
        });
      }
      createdAt = range.start; // 해당 날짜의 00:00:00으로 맞춤
    }

    const newTodo = await prisma.todo.create({
      data: {
        content,
        userId,
        isDone: false,
        createdAt, // ⭐ 명시적으로 설정
      },
    });

    res.status(201).json(newTodo);
  } catch (error) {
    console.error("🔥 Todo 생성 오류:", error);
    res.status(500).json({ error: "할 일 생성 실패" });
  }
};

// 할 일 조회
exports.getTodos = async (req, res) => {
  const userId = req.user.id;

  try {
    const { done, date } = req.query;
    const where = { userId };

    // 완료 여부 필터
    if (done === "true") where.isDone = true;
    if (done === "false") where.isDone = false;

    // ✅ 날짜 필터 (없으면 오늘 기준)
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const range = getDateRange(targetDate);

    if (!range) {
      return res.status(400).json({
        error: "날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식으로 보내주세요.",
      });
    }

    where.createdAt = {
      gte: range.start,
      lt: range.end,
    };

    const todos = await prisma.todo.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(todos);
  } catch (error) {
    console.error("🔥 할 일 조회 오류:", error);
    res.status(500).json({ error: "할 일 조회 실패" });
  }
};

// 할 일 수정
exports.updateTodo = async (req, res) => {
  const { id } = req.params;
  const { content, isDone } = req.body;
  const userId = req.user.id;

  try {
    const todo = await prisma.todo.findUnique({
      where: { id: Number(id) },
    });

    if (!todo) {
      return res.status(404).json({ error: "해당 할 일을 찾을 수 없습니다." });
    }

    if (todo.userId !== userId) {
      return res.status(403).json({ error: "수정 권한이 없습니다." });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: Number(id) },
      data: {
        ...(content !== undefined && { content }),
        ...(typeof isDone === "boolean" && { isDone }),
      },
    });

    res.json(updatedTodo);
  } catch (error) {
    console.error("🔥 할 일 수정 오류:", error);
    res.status(500).json({ error: "할 일 수정 실패" });
  }
};

// 할 일 삭제
exports.deleteTodo = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const todo = await prisma.todo.findUnique({
      where: { id: Number(id) },
    });

    if (!todo) {
      return res
          .status(404)
          .json({ error: "삭제할 할 일이 존재하지 않습니다." });
    }

    if (todo.userId !== userId) {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    await prisma.todo.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "삭제 완료" });
  } catch (error) {
    console.error("🔥 삭제 오류:", error);
    res.status(500).json({ error: "삭제 실패" });
  }
};

// 할 일 완료 상태 토글
exports.toggleTodoStatus = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  console.log("🧪 토큰에서 가져온 userId(id):", userId);

  try {
    const todo = await prisma.todo.findUnique({
      where: { id: Number(id) },
    });

    if (!todo) {
      return res.status(404).json({ error: "해당 할 일을 찾을 수 없습니다." });
    }

    if (todo.userId !== userId) {
      return res.status(403).json({ error: "토글 권한이 없습니다." });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: Number(id) },
      data: {
        isDone: !todo.isDone,
      },
    });

    res.json(updatedTodo);
  } catch (error) {
    console.error("🔥 토글 오류:", error);
    res.status(500).json({ error: "완료 상태 토글 실패" });
  }
};

// ✅ 할 일 달성률 통계 (특정 날짜 기준)
exports.getTodoStatistics = async (req, res) => {
  const userId = req.user.id;

  try {
    const { date } = req.query;
    const todayString = new Date().toISOString().slice(0, 10);
    const target = date || todayString;

    const range = getDateRange(target);
    if (!range) {
      return res
          .status(400)
          .json({ error: "잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 보내주세요." });
    }
    const { start, end } = range;

    // createdAt 기준으로 해당 날짜의 할 일만 집계
    const todos = await prisma.todo.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const total = todos.length;
    const completed = todos.filter((t) => t.isDone).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    res.status(200).json({
      total,
      completed,
      rate,
    });
  } catch (error) {
    console.error("🔥 통계 조회 오류:", error);
    res.status(500).json({ error: "할 일 통계 조회 실패" });
  }
};