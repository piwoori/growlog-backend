// src/controllers/reflection.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * YYYY-MM-DD 문자열을 DateTime 범위 [start, end) 로 변환
 */
const getDateRange = (dateString) => {
  const base = new Date(dateString);
  if (isNaN(base.getTime())) return null;

  const nextDay = new Date(base);
  nextDay.setDate(nextDay.getDate() + 1);

  return { start: base, end: nextDay };
};

/**
 * 회고 생성
 * POST /reflections
 * body: { content, date? }
 */
const createReflection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, date } = req.body;

    if (!content) {
      return res.status(400).json({ error: '회고 내용은 필수입니다.' });
    }

    // 날짜 문자열 (없으면 오늘)
    const todayString = new Date().toISOString().slice(0, 10);
    const target = date || todayString;

    const range = getDateRange(target);
    if (!range) {
      return res
          .status(400)
          .json({ error: '잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 보내주세요.' });
    }
    const { start, end } = range;

    // ✅ 1일 1회고 보장: 이미 있으면 생성 막기
    const existing = await prisma.reflection.findFirst({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
    });

    if (existing) {
      return res
          .status(409)
          .json({ error: '이미 이 날짜에 회고가 기록되어 있습니다.' });
    }

    // 우선 회고 생성
    let newReflection = await prisma.reflection.create({
      data: {
        content,
        userId,
        date: start,
      },
    });

    // ✅ 같은 날짜 감정이 있으면 1:1 연결 (Reflection.emotionId 업데이트)
    const emotion = await prisma.emotion.findFirst({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
    });

    if (emotion) {
      newReflection = await prisma.reflection.update({
        where: { id: newReflection.id },
        data: { emotionId: emotion.id }, // Reflection 모델에 emotionId Int? 필드가 있다고 가정
      });
    }

    return res.status(201).json({
      message: '회고가 성공적으로 저장되었습니다.',
      reflection: newReflection,
    });
  } catch (error) {
    console.error('❌ 회고 저장 오류:', error);
    return res
        .status(500)
        .json({ error: '회고 저장 중 오류가 발생했습니다.' });
  }
};

/**
 * 회고 목록 조회 (옵션: 날짜별)
 * GET /reflections?date=YYYY-MM-DD
 */
const getReflections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let where = { userId };

    if (date) {
      const range = getDateRange(date);
      if (!range) {
        return res
            .status(400)
            .json({ error: '잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 보내주세요.' });
      }
      const { start, end } = range;

      where = {
        ...where,
        date: {
          gte: start,
          lt: end,
        },
      };
    }

    const reflections = await prisma.reflection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ reflections });
  } catch (error) {
    console.error('❌ 회고 목록 조회 오류:', error);
    return res
        .status(500)
        .json({ error: '회고 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 회고 상세 조회
 * GET /reflections/:id
 */
const getReflectionById = async (req, res) => {
  try {
    const userId = req.user.id;
    const reflectionId = parseInt(req.params.id, 10);

    const reflection = await prisma.reflection.findUnique({
      where: { id: reflectionId },
      include: {
        emotion: true, // 같은 날짜 감정이 연결되어 있다면 함께 반환
      },
    });

    if (!reflection) {
      return res.status(404).json({ message: '회고를 찾을 수 없습니다.' });
    }

    if (reflection.userId !== userId) {
      return res
          .status(403)
          .json({ message: '본인의 회고만 조회할 수 있습니다.' });
    }

    return res.status(200).json({ reflection });
  } catch (error) {
    console.error('❌ 회고 상세 조회 오류:', error);
    return res
        .status(500)
        .json({ message: '회고 상세 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 회고 수정
 * PATCH /reflections/:id
 */
const updateReflection = async (req, res) => {
  try {
    const userId = req.user.id;
    const reflectionId = parseInt(req.params.id, 10);
    const { content } = req.body;

    if (!content) {
      return res
          .status(400)
          .json({ error: '수정할 회고 내용을 입력해주세요.' });
    }

    const existing = await prisma.reflection.findUnique({
      where: { id: reflectionId },
    });

    if (!existing) {
      return res.status(404).json({ error: '회고를 찾을 수 없습니다.' });
    }

    if (existing.userId !== userId) {
      return res
          .status(403)
          .json({ error: '본인의 회고만 수정할 수 있습니다.' });
    }

    const updated = await prisma.reflection.update({
      where: { id: reflectionId },
      data: { content },
    });

    return res.status(200).json({
      message: '회고가 성공적으로 수정되었습니다.',
      reflection: updated,
    });
  } catch (error) {
    console.error('❌ 회고 수정 오류:', error);
    return res
        .status(500)
        .json({ error: '회고 수정 중 오류가 발생했습니다.' });
  }
};

module.exports = {
  createReflection,
  getReflections,
  getReflectionById,
  updateReflection,
};