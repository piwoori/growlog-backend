// src/controllers/emotion.controller.js
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
 * 감정 기록 생성
 * POST /emotions
 * body: { emoji, note?, date? }
 */
const createEmotion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emoji, note, date } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: '이모지는 필수입니다.' });
    }

    const todayString = new Date().toISOString().slice(0, 10);
    const target = date || todayString;

    const range = getDateRange(target);
    if (!range) {
      return res
          .status(400)
          .json({ error: '잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 보내주세요.' });
    }
    const { start, end } = range;

    // ✅ 1일 1감정 보장: 이미 있으면 생성 막기
    const existing = await prisma.emotion.findFirst({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
    });

    if (existing) {
      return res
          .status(409)
          .json({ error: '이미 이 날짜에 감정이 기록되어 있습니다.' });
    }

    // 감정 생성
    const newEmotion = await prisma.emotion.create({
      data: {
        emoji,
        note: note || null,
        userId,
        date: start,
      },
    });

    // ✅ 같은 날짜 회고가 있으면 1:1 연결 (Reflection.emotionId 업데이트)
    const reflection = await prisma.reflection.findFirst({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
    });

    if (reflection) {
      await prisma.reflection.update({
        where: { id: reflection.id },
        data: { emotionId: newEmotion.id }, // Reflection 모델에 emotionId Int? 필드가 있다고 가정
      });
    }

    return res.status(201).json({
      message: '감정이 성공적으로 기록되었습니다.',
      emotion: newEmotion,
    });
  } catch (error) {
    console.error('❌ 감정 기록 오류:', error);
    return res
        .status(500)
        .json({ error: '감정 기록 중 오류가 발생했습니다.' });
  }
};

/**
 * 감정 목록 조회 (옵션: 날짜, 이모지)
 * GET /emotions?date=YYYY-MM-DD&emoji=😄
 */
const getEmotions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, emoji } = req.query;

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

    if (emoji) {
      where = {
        ...where,
        emoji: String(emoji),
      };
    }

    const emotions = await prisma.emotion.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return res.status(200).json({ emotions });
  } catch (error) {
    console.error('❌ 감정 목록 조회 오류:', error);
    return res
        .status(500)
        .json({ error: '감정 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 감정 상세 조회
 * GET /emotions/:id
 */
const getEmotionById = async (req, res) => {
  try {
    const userId = req.user.id;
    const emotionId = parseInt(req.params.id, 10);

    const emotion = await prisma.emotion.findUnique({
      where: { id: emotionId },
    });

    if (!emotion) {
      return res.status(404).json({ error: '감정을 찾을 수 없습니다.' });
    }

    if (emotion.userId !== userId) {
      return res
          .status(403)
          .json({ error: '본인의 감정만 조회할 수 있습니다.' });
    }

    return res.status(200).json({ emotion });
  } catch (error) {
    console.error('❌ 감정 상세 조회 오류:', error);
    return res
        .status(500)
        .json({ error: '감정 상세 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 감정 수정 (이모지/메모 수정)
 * PATCH /emotions/:id
 * body: { emoji?, note? }
 */
const updateEmotion = async (req, res) => {
  try {
    const userId = req.user.id;
    const emotionId = parseInt(req.params.id, 10);
    const { emoji, note } = req.body;

    if (!emoji && typeof note === 'undefined') {
      return res
          .status(400)
          .json({ error: '수정할 내용이 없습니다. emoji 또는 note를 보내주세요.' });
    }

    const existing = await prisma.emotion.findUnique({
      where: { id: emotionId },
    });

    if (!existing) {
      return res.status(404).json({ error: '감정을 찾을 수 없습니다.' });
    }

    if (existing.userId !== userId) {
      return res
          .status(403)
          .json({ error: '본인의 감정만 수정할 수 있습니다.' });
    }

    const updated = await prisma.emotion.update({
      where: { id: emotionId },
      data: {
        emoji: emoji ?? existing.emoji,
        note: typeof note === 'undefined' ? existing.note : note,
      },
    });

    return res.status(200).json({
      message: '감정이 성공적으로 수정되었습니다.',
      emotion: updated,
    });
  } catch (error) {
    console.error('❌ 감정 수정 오류:', error);
    return res
        .status(500)
        .json({ error: '감정 수정 중 오류가 발생했습니다.' });
  }
};

module.exports = {
  createEmotion,
  getEmotions,
  getEmotionById,
  updateEmotion,
};