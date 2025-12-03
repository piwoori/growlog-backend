const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 회고 생성
 * POST /reflections
 */
const createReflection = async (req, res) => {
  try {
    const userId = req.user.id; // 🔥 userId가 아니라 id 로 통일
    const { content, date } = req.body;

    if (!content) {
      return res.status(400).json({ error: '회고 내용은 필수입니다.' });
    }

    const data = {
      content,
      userId,
    };

    // ⭐ date가 DateTime 컬럼일 때: 문자열 → Date로 변환해서 저장
    if (date) {
      const parsed = new Date(date); // "2025-12-03" → Date 객체
      if (isNaN(parsed.getTime())) {
        return res
            .status(400)
            .json({ error: '잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 보내주세요.' });
      }
      data.date = parsed;
    }

    const newReflection = await prisma.reflection.create({
      data,
    });

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

    // 기본 조건: 본인 것만
    let where = { userId };

    // ⭐ date가 DateTime 컬럼일 때: 하루 범위(gte ~ lt)로 조회
    if (date) {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return res
            .status(400)
            .json({ error: '잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 보내주세요.' });
      }

      const nextDay = new Date(parsed);
      nextDay.setDate(nextDay.getDate() + 1);

      where = {
        ...where,
        date: {
          gte: parsed,
          lt: nextDay,
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
        emotion: true, // 감정 연결 시 함께 조회
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