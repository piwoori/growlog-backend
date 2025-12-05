// src/controllers/emotion.controller.js
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();

// YYYY-MM-DD → [start, end) 범위 구하기
const getDateRange = (dateString) => {
  const base = dateString ? new Date(dateString) : new Date();
  if (isNaN(base.getTime())) return null;

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

/**
 * 🔮 AI 감정 분석 호출
 * - note(text)가 없으면 null
 * - 실패해도 throw 안 하고 null 반환
 */
const analyzeEmotionText = async (text) => {
  if (!text || !text.trim()) return null;

  try {
    const baseUrl = process.env.AI_URL || "http://localhost:8000";

    // ❗ 여기: /sentiment → /analyze 로 수정
    const url = `${baseUrl}/analyze`;
    console.log("🔮 AI 분석 호출:", url, "text:", text);

    const res = await axios.post(url, { text });

    const data = res.data;
    console.log("🔮 AI 분석 응답:", data);

    return {
      positive: data.positive ?? data.pos ?? 0,
      neutral: data.neutral ?? data.neu ?? 0,
      negative: data.negative ?? data.neg ?? 0,
      label: data.label ?? data.prediction ?? null,
      model: data.model || "unknown",
      version: data.version || null,
    };
  } catch (error) {
    console.error("❌ AI 감정 분석 실패:", error.response?.data || error.message);
    return null;
  }
};

/**
 * 🌱 AI 조언 생성 호출
 * - text가 없으면 null
 * - 실패해도 throw 안 하고 null (서비스 계속 동작)
 */
const generateEmotionAdvice = async (text, emoji) => {
  if (!text || !text.trim()) return null;

  try {
    const baseUrl = process.env.AI_URL || "http://localhost:8000";
    const res = await axios.post(`${baseUrl}/advice`, {
      text,
      emoji: emoji || null,
    });

    // FastAPI에서 내려주는 그대로 사용
    // { advice, model, source, note? }
    return res.data;
  } catch (error) {
    console.error(
        "❌ AI 조언 생성 실패:",
        error.response?.data || error.message
    );
    return null;
  }
};

/**
 * 감정 기록 생성 (하루 1개)
 * POST /emotions
 */
const createEmotion = async (req, res) => {
  const userId = req.user.id;
  const { emoji, note, date } = req.body;

  // 🔮 AI 분석 호출 (note가 있을 경우)
  const aiResult = await analyzeEmotionText(note);

// 🌱 AI 조언 호출 (note + emoji 기반)
  const adviceResult = await generateEmotionAdvice(note, emoji);

  const newEmotion = await prisma.emotion.create({
    data: {
      emoji,
      note: note || null,
      userId,
      date: start,

      // 감정 분석 결과
      ...(aiResult && {
        positive: aiResult.positive,
        neutral: aiResult.neutral,
        negative: aiResult.negative,
        aiLabel: aiResult.label,
        aiModel: aiResult.model,
        aiVersion: aiResult.version,
      }),

      // ✅ 조언 결과 저장
      ...(adviceResult && {
        aiAdvice: adviceResult.advice,
        aiAdviceModel: adviceResult.model,
        aiAdviceSource: adviceResult.source || null,
      }),
    },
  });

  if (!emoji) {
    return res.status(400).json({ error: "이모지는 필수입니다." });
  }

  try {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const range = getDateRange(targetDate);

    if (!range) {
      return res
          .status(400)
          .json({ error: "날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식으로 보내주세요." });
    }

    const { start, end } = range;

    // 이미 해당 날짜에 감정이 있는지 체크
    const existing = await prisma.emotion.findFirst({
      where: {
        userId,
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    if (existing) {
      return res
          .status(400)
          .json({ error: "이미 이 날짜에 감정이 기록되어 있습니다." });
    }

    // 🔮 AI 분석 (메모가 있으면)
    const aiResult = await analyzeEmotionText(note);

    const newEmotion = await prisma.emotion.create({
      data: {
        emoji,
        note: note || null,
        userId,
        date: start,
        ...(aiResult && {
          positive: aiResult.positive,
          neutral: aiResult.neutral,
          negative: aiResult.negative,
          aiLabel: aiResult.label,
          aiModel: aiResult.model,
          aiVersion: aiResult.version,
        }),
      },
    });

    return res.status(201).json({
      message: "감정이 성공적으로 기록되었습니다.",
      emotion: newEmotion,
    });
  } catch (error) {
    console.error("❌ 감정 기록 오류:", error);
    return res.status(500).json({ error: "감정 기록 중 오류가 발생했습니다." });
  }
};

/**
 * 감정 조회
 * GET /emotions?date=YYYY-MM-DD&emoji=😄
 * - date 없으면 오늘 기준
 */
const getEmotions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, emoji } = req.query;

    const targetDate = date || new Date().toISOString().slice(0, 10);
    const range = getDateRange(targetDate);

    if (!range) {
      return res
          .status(400)
          .json({ error: "날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식으로 보내주세요." });
    }

    const where = {
      userId,
      date: {
        gte: range.start,
        lt: range.end,
      },
    };

    if (emoji) {
      where.emoji = emoji;
    }

    const emotions = await prisma.emotion.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return res.status(200).json({ emotions });
  } catch (error) {
    console.error("❌ 감정 조회 오류:", error);
    return res.status(500).json({ error: "감정 조회 중 오류가 발생했습니다." });
  }
};

/**
 * 감정 수정 (ID 기준)
 * PATCH /emotions/:id
 */
const updateEmotion = async (req, res) => {
  const userId = req.user.id;
  const emotionId = parseInt(req.params.id, 10);
  const { emoji, note } = req.body;

  if (Number.isNaN(emotionId)) {
    return res.status(400).json({ error: "잘못된 감정 ID입니다." });
  }

  try {
    const existing = await prisma.emotion.findUnique({
      where: { id: emotionId },
    });

    if (!existing) {
      return res.status(404).json({ error: "감정을 찾을 수 없습니다." });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: "본인의 감정만 수정할 수 있습니다." });
    }

    let aiResult = null;
    let adviceResult = null;

    // 🧠 note가 변경된 경우에만 AI 재분석 + 조언 재생성
    if (typeof note !== "undefined" && note !== existing.note) {
      const newText = note;
      const newEmoji = typeof emoji === "undefined" ? existing.emoji : emoji;

      [aiResult, adviceResult] = await Promise.all([
        analyzeEmotionText(newText),
        generateEmotionAdvice(newText, newEmoji),
      ]);
    }

    const updated = await prisma.emotion.update({
      where: { id: emotionId },
      data: {
        emoji: typeof emoji === "undefined" ? existing.emoji : emoji,
        note: typeof note === "undefined" ? existing.note : note,

        // 감정 분석 결과 업데이트 (있을 때만)
        ...(aiResult && {
          positive: aiResult.positive,
          neutral: aiResult.neutral,
          negative: aiResult.negative,
          aiLabel: aiResult.label,
          aiModel: aiResult.model,
          aiVersion: aiResult.version,
        }),

        // ✅ 조언도 업데이트
        ...(adviceResult && {
          aiAdvice: adviceResult.advice,
          aiAdviceModel: adviceResult.model,
          aiAdviceSource: adviceResult.source || null,
        }),
      },
    });

    return res.status(200).json({
      message: "감정이 성공적으로 수정되었습니다.",
      emotion: updated,
    });
  } catch (error) {
    console.error("❌ 감정 수정 오류:", error);
    return res.status(500).json({ error: "감정 수정 중 오류가 발생했습니다." });
  }
};

module.exports = {
  createEmotion,
  getEmotions,
  updateEmotion,
};