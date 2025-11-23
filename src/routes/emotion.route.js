// src/routes/emotion.route.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

const {
  createEmotion,
  updateTodayEmotion,
  getEmotions,
} = require("../controllers/emotion.controller");

const optionalAuth = require("../middlewares/optionalAuth");
const fallbackUser = require("../middlewares/fallbackUser");
const ensureUserExists = require("../middlewares/ensureUserExists");

const prisma = require("../lib/prisma");
const AI_API_URL = process.env.AI_API_URL || "http://localhost:8000";

// ✅ 모든 emotions 엔드포인트: 토큰 있으면 인증, 없으면 임시 유저(id=1) + 유저 보장
router.use(optionalAuth, fallbackUser, ensureUserExists);

const normalizeToMidnight = (input) => {
  const d = input ? new Date(input) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * @swagger
 * /emotions:
 *   post:
 *     summary: "감정 기록 (기본: 오늘, 선택적으로 날짜 지정 가능) — 인증 선택"
 *     tags: [Emotions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["emoji","date"]
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "😊"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-08-01"
 *               text:
 *                 type: string
 *                 example: "오늘은 피곤했지만 뿌듯하다."
 *     responses:
 *       201:
 *         description: "감정 기록 성공"
 *       409:
 *         description: "이미 해당 날짜에 감정을 기록함"
 *       500:
 *         description: "서버 오류"
 */
router.post("/", createEmotion);

/**
 * @swagger
 * /emotions/today:
 *   patch:
 *     summary: "오늘 감정 수정 — 인증 선택"
 *     tags: [Emotions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["emoji"]
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "😢"
 *               text:
 *                 type: string
 *                 example: "오늘은 좀 지침"
 *     responses:
 *       200:
 *         description: "감정 수정 성공"
 *       404:
 *         description: "오늘 감정 기록이 존재하지 않음"
 *       500:
 *         description: "서버 오류"
 */
router.patch("/today", updateTodayEmotion);

/**
 * @swagger
 * /emotions:
 *   get:
 *     summary: "감정 조회 (기본: 오늘, 또는 날짜/감정 조건 검색) — 인증 선택"
 *     description: "쿼리 없으면 오늘 기준. 인증 토큰 없으면 임시 유저(id=1) 기준으로 동작."
 *     tags: [Emotions]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-08-01"
 *       - in: query
 *         name: emoji
 *         schema:
 *           type: string
 *         example: "😊"
 *     responses:
 *       200:
 *         description: "감정 조회 성공"
 *       500:
 *         description: "서버 오류"
 */
router.get("/", getEmotions);

/**
 * @swagger
 * /emotions/analyze-and-save:
 *   post:
 *     summary: "AI 감정 분석 후 결과를 Emotion에 upsert — 인증 선택"
 *     tags: [Emotions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ["text"]
 *             properties:
 *               text:
 *                 type: string
 *                 example: "오늘은 피곤했지만 뿌듯하다."
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-11-04"
 *     responses:
 *       200:
 *         description: "AI 감정 분석 및 저장 성공"
 *       400:
 *         description: "text 누락"
 *       500:
 *         description: "서버 오류"
 */
router.post("/analyze-and-save", async (req, res, next) => {
  try {
    const userId = req.user.id; // ensureUserExists 덕분에 존재
    const { text, date } = req.body;
    if (!text) return res.status(400).json({ message: "text is required" });

    const { data } = await axios.post(`${AI_API_URL}/analyze`, { text });
    const targetDate = normalizeToMidnight(date);

    const saved = await prisma.emotion.upsert({
      where: { userId_date: { userId, date: targetDate } },
      update: {
        positive: data.positive,
        neutral: data.neutral,
        negative: data.negative,
        aiLabel: data.label,
        aiModel: "cardiffnlp/twitter-xlm-roberta-base-sentiment",
        aiVersion: "v0.2",
      },
      create: {
        userId,
        date: targetDate,
        positive: data.positive,
        neutral: data.neutral,
        negative: data.negative,
        aiLabel: data.label,
        aiModel: "cardiffnlp/twitter-xlm-roberta-base-sentiment",
        aiVersion: "v0.2",
      },
    });

    res.json({ ok: true, emotion: saved, ai: data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;