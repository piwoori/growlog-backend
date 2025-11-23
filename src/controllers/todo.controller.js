// src/controllers/todo.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 할 일 등록
exports.createTodo = async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id; // ✅ 수정: userId → id

  if (!content) {
    return res.status(400).json({ error: '할 일 내용은 필수입니다.' });
  }

  try {
    const newTodo = await prisma.todo.create({
      data: {
        content,
        userId,
        isDone: false,
      },
    });
    res.status(201).json(newTodo);
  } catch (error) {
    console.error('🔥 Todo 생성 오류:', error);
    res.status(500).json({ error: '할 일 생성 실패' });
  }
};

// 할 일 조회
exports.getTodos = async (req, res) => {
  const userId = req.user.id; // ✅ 수정

  try {
    const { done } = req.query;
    const where = { userId };

    if (done === 'true') where.isDone = true;
    if (done === 'false') where.isDone = false;

    const todos = await prisma.todo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(todos);
  } catch (error) {
    console.error('🔥 할 일 조회 오류:', error);
    res.status(500).json({ error: '할 일 조회 실패' });
  }
};

// 할 일 수정
exports.updateTodo = async (req, res) => {
  const { id } = req.params;
  const { content, isDone } = req.body;
  const userId = req.user.id; // ✅ 수정

  try {
    const todo = await prisma.todo.findUnique({
      where: { id: Number(id) },
    });

    if (!todo) {
      return res.status(404).json({ error: '해당 할 일을 찾을 수 없습니다.' });
    }

    if (todo.userId !== userId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: Number(id) },
      data: {
        ...(content !== undefined && { content }),
        ...(isDone !== undefined && { isDone }),
      },
    });

    res.json(updatedTodo);
  } catch (error) {
    console.error('🔥 할 일 수정 오류:', error);
    res.status(500).json({ error: '할 일 수정 실패' });
  }
};

// 할 일 삭제
exports.deleteTodo = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // ✅ 수정

  try {
    const todo = await prisma.todo.findUnique({
      where: { id: Number(id) },
    });

    if (!todo) {
      return res.status(404).json({ error: '삭제할 할 일이 존재하지 않습니다.' });
    }

    if (todo.userId !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await prisma.todo.delete({
      where: { id: Number(id) },
    });

    res.json({ message: '삭제 완료' });
  } catch (error) {
    console.error('🔥 삭제 오류:', error);
    res.status(500).json({ error: '삭제 실패' });
  }
};

// 할 일 완료 상태 토글
exports.toggleTodoStatus = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // ✅ 수정
  console.log('🧪 토큰에서 가져온 userId(id):', userId);

  try {
    const todo = await prisma.todo.findUnique({
      where: { id: Number(id) },
    });

    if (!todo) {
      return res.status(404).json({ error: '해당 할 일을 찾을 수 없습니다.' });
    }

    if (todo.userId !== userId) {
      return res.status(403).json({ error: '토글 권한이 없습니다.' });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: Number(id) },
      data: {
        isDone: !todo.isDone,
      },
    });

    res.json(updatedTodo);
  } catch (error) {
    console.error('🔥 토글 오류:', error);
    res.status(500).json({ error: '완료 상태 토글 실패' });
  }
};

// ✅ 할 일 달성률 통계
exports.getTodoStatistics = async (req, res) => {
  const userId = req.user.id; // ✅ 수정

  try {
    const total = await prisma.todo.count({
      where: { userId },
    });

    const completed = await prisma.todo.count({
      where: {
        userId,
        isDone: true,
      },
    });

    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    res.status(200).json({
      total,
      completed,
      rate,
    });
  } catch (error) {
    console.error('🔥 통계 조회 오류:', error);
    res.status(500).json({ error: '할 일 통계 조회 실패' });
  }
};