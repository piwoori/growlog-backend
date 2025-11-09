// src/controllers/emotion.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = require("../lib/prisma");
const ai = require("../utils/aiClient"); // ✅ FastAPI 연동 클라이언트

// (선택) FastAPI 모델 메타 고정값 — 필요 시 env로 이관
const AI_MODEL_NAME = "cardiffnlp/twitter-xlm-roberta-base-sentiment";
const AI_MODEL_VERSION = "v0.3";

// ✅ 모듈 로드 시점에 req를 쓰지 말 것!
const getUserId = (req) => req.user?.id ?? 1;

/**
 * 'YYYY-MM-DD' 또는 Date를 받아 현지(서버 타임존) 00:00:00로 정규화
 * - 클라이언트가 문자열을 주면 그 날짜의 00:00로 맞춤
 * - 기존 setHours(0,0,0,0)과 동일 목적. KST 기준 고정이 필요하면 서버 TZ를 KST로 두거나, dayjs.tz 등의 라이브러리를 사용 권장.
 */
const normalizeToMidnight = (input) => {
  const d = input instanceof Date ? new Date(input) : new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * 감정 기록 (기본: 오늘, 선택적으로 날짜/텍스트 지정 가능)
 * body: { emoji, date, text? }
 *  - text가 오면 AI 분석을 호출하여 확률/라벨/메타를 같이 저장
 */
const createEmotion = async (req, res) => {
  const userId = getUserId(req);
  const { emoji, date, text } = req.body;

  if (!emoji || !date) {
    return res.status(400).json({ message: "emoji와 date는 필수입니다." });
  }

  try {
    const targetDate = normalizeToMidnight(date);

    // 유니크 제약: (userId, date)
    const existing = await prisma.emotion.findUnique({
      where: { userId_date: { userId, date: targetDate } },
    });
    if (existing) {
      return res.status(409).json({ message: "이 날짜에는 이미 감정을 기록했습니다." });
    }

    // 기본 저장 데이터
    const data = {
      userId,
      emoji,
      date: targetDate,
    };

    // 텍스트가 있으면 AI 분석 시도 (실패해도 본문 저장은 진행)
    if (text && text.trim()) {
      try {
        const { data: aiRes } = await ai.post("/analyze", { text });
        // FastAPI 응답: { text, positive, neutral, negative, label, device? }
        data.positive = aiRes.positive;
        data.neutral = aiRes.neutral;
        data.negative = aiRes.negative;
        data.aiLabel = aiRes.label;
        data.aiModel = AI_MODEL_NAME;
        data.aiVersion = AI_MODEL_VERSION;
      } catch (err) {
        console.warn("AI analyze failed (createEmotion):", err?.response?.data || err.message);
      }
    }

    const emotion = await prisma.emotion.create({ data });
    return res.status(201).json({ message: "감정이 저장되었습니다.", emotion });
  } catch (error) {
    console.error("❌ 감정 저장 오류:", error);
    return res.status(500).json({ message: "감정 저장 중 서버 오류 발생" });
  }
};

/**
 * 오늘 감정 수정
 * body: { emoji, text? }
 *  - text가 오면 재분석하여 확률/라벨/메타도 업데이트
 */
const updateTodayEmotion = async (req, res) => {
  const userId = getUserId(req);
  const { emoji, text } = req.body;

  if (!emoji) {
    return res.status(400).json({ message: "emoji는 필수입니다." });
  }

  const today = normalizeToMidnight(new Date());

  try {
    const existing = await prisma.emotion.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (!existing) {
      return res.status(404).json({ message: "오늘 기록된 감정이 없습니다." });
    }

    const data = { emoji };

    if (text && text.trim()) {
      try {
        const { data: aiRes } = await ai.post("/analyze", { text });
        data.positive = aiRes.positive;
        data.neutral = aiRes.neutral;
        data.negative = aiRes.negative;
        data.aiLabel = aiRes.label;
        data.aiModel = AI_MODEL_NAME;
        data.aiVersion = AI_MODEL_VERSION;
      } catch (err) {
        console.warn("AI analyze failed (updateTodayEmotion):", err?.response?.data || err.message);
      }
    }

    const updated = await prisma.emotion.update({
      where: { userId_date: { userId, date: today } },
      data,
    });

    return res.status(200).json({ message: "감정이 수정되었습니다.", emotion: updated });
  } catch (error) {
    console.error("❌ 감정 수정 오류:", error);
    return res.status(500).json({ message: "감정 수정 중 서버 오류 발생" });
  }
};

/**
 * 감정 조회 (기본: 오늘, 또는 날짜/감정 조건 조회)
 * query: ?date=YYYY-MM-DD&emoji=😊
 */
const getEmotions = async (req, res) => {
  const userId = getUserId(req);
  const { date, emoji } = req.query;

  try {
    const where = { userId };

    if (date) {
      where.date = normalizeToMidnight(date);
    } else {
      where.date = normalizeToMidnight(new Date());
    }

    if (emoji) where.emoji = String(emoji);

    const emotions = await prisma.emotion.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return res.status(200).json({ emotions });
  } catch (error) {
    console.error("❌ 감정 조회 오류:", error);
    return res.status(500).json({ message: "감정 조회 중 서버 오류 발생" });
  }
};

module.exports = {
  createEmotion,
  updateTodayEmotion,
  getEmotions,
};