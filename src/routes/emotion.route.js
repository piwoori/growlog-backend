// src/routes/emotion.route.js
const express = require('express');
const router = express.Router();
const {
  createEmotion,
  updateTodayEmotion,
  getEmotions,
} = require('../controllers/emotion.controller');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /emotions:
 *   post:
 *     summary: "감정 기록 (기본: 오늘, 선택적으로 날짜 지정 가능)"
 *     tags: [Emotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *               - date
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "😊"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: "기록할 날짜 (형식: YYYY-MM-DD)"
 *                 example: "2025-08-01"
 *     responses:
 *       201:
 *         description: "감정 기록 성공"
 *       409:
 *         description: "이미 해당 날짜에 감정을 기록함"
 *       500:
 *         description: "서버 오류"
 */
router.post('/', authenticateToken, createEmotion);

/**
 * @swagger
 * /emotions/today:
 *   put:
 *     summary: "오늘 감정 수정"
 *     tags: [Emotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "😢"
 *     responses:
 *       200:
 *         description: "감정 수정 성공"
 *       404:
 *         description: "오늘 감정 기록이 존재하지 않음"
 *       500:
 *         description: "서버 오류"
 */
router.put('/today', authenticateToken, updateTodayEmotion);

/**
 * @swagger
 * /emotions:
 *   get:
 *     summary: "감정 조회 (기본: 오늘, 또는 날짜/감정 조건 검색)"
 *     description: "쿼리 스트링을 통해 특정 날짜 또는 특정 이모지의 감정 기록을 조회할 수 있습니다. 쿼리가 없으면 오늘 기준으로 조회합니다."
 *     tags: [Emotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: "조회할 날짜 (형식: YYYY-MM-DD)"
 *         example: "2025-08-01"
 *       - in: query
 *         name: emoji
 *         schema:
 *           type: string
 *         required: false
 *         description: "조회할 이모지 (예: 😊)"
 *         example: "😊"
 *     responses:
 *       200:
 *         description: "감정 조회 성공"
 *       500:
 *         description: "서버 오류"
 */
router.get('/', authenticateToken, getEmotions);

module.exports = router;
/**
 * @swagger
 * /emotions/analyze-and-save:
 *   post:
 *     summary: "AI 감정 분석 후 결과를 Emotion에 저장"
 *     description: "문장(text)을 입력하면 AI 서버에서 감정(긍정/중립/부정)을 분석하고, 해당 결과를 날짜별 Emotion 데이터에 upsert로 저장합니다."
 *     tags: [Emotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
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
 *       401:
 *         description: "인증 필요"
 *       500:
 *         description: "서버 오류"
 */
router.post('/analyze-and-save', authenticateToken, async (req, res, next) => {
  const axios = require('axios');
  const { prisma } = require('../prisma'); // 네 프로젝트 구조에 맞게 import
  const AI_API_URL = process.env.AI_API_URL || 'http://localhost:8000';

  try {
    const userId = req.user?.id; // JWT 인증 미들웨어에서 주입됨
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { text, date } = req.body;
    if (!text) return res.status(400).json({ message: 'text is required' });

    // FastAPI 서버 호출
    const { data } = await axios.post(`${AI_API_URL}/analyze`, { text });

    // 날짜 지정 없으면 오늘 날짜 기준
    const d = date ? new Date(date) : new Date(new Date().toDateString());

    // Emotion 데이터 저장 (하루 1개 정책 → upsert)
    const saved = await prisma.emotion.upsert({
      where: { userId_date: { userId, date: d } },
      update: {
        positive: data.positive,
        neutral: data.neutral,
        negative: data.negative,
        aiLabel: data.label,
        aiModel: 'cardiffnlp/twitter-xlm-roberta-base-sentiment',
        aiVersion: 'v0.2',
      },
      create: {
        userId,
        date: d,
        positive: data.positive,
        neutral: data.neutral,
        negative: data.negative,
        aiLabel: data.label,
        aiModel: 'cardiffnlp/twitter-xlm-roberta-base-sentiment',
        aiVersion: 'v0.2',
      },
    });

    res.json({ ok: true, emotion: saved, ai: data });
  } catch (error) {
    next(error);
  }
});