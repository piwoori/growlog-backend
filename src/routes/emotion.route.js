// src/routes/emotion.route.js
const express = require("express");
const router = express.Router();

const {
  createEmotion,
  getEmotions,
  updateEmotion,
} = require("../controllers/emotion.controller");

const { authenticateToken } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Emotions
 *   description: 감정 기록 API
 */

/**
 * @swagger
 * /emotions:
 *   post:
 *     summary: "감정 기록 생성"
 *     description: "하루에 하나의 감정을 이모지와 메모로 기록합니다."
 *     tags: [Emotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "😄"
 *               note:
 *                 type: string
 *                 example: "오늘 Growlog 대시보드를 완성했다."
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-05"
 *     responses:
 *       201:
 *         description: "감정 기록 성공"
 *       400:
 *         description: "잘못된 요청 (이미 해당 날짜에 감정이 존재하는 경우 등)"
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */
router.post("/", authenticateToken, createEmotion);

/**
 * @swagger
 * /emotions:
 *   get:
 *     summary: "날짜별 감정 조회"
 *     description: "하루에 기록된 감정을 조회합니다. 날짜를 지정하지 않으면 오늘 기준으로 조회합니다."
 *     tags: [Emotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: "조회할 날짜 (YYYY-MM-DD)"
 *       - in: query
 *         name: emoji
 *         required: false
 *         schema:
 *           type: string
 *         description: "특정 이모지로 필터링"
 *     responses:
 *       200:
 *         description: "감정 조회 성공"
 *       400:
 *         description: "잘못된 요청"
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */
router.get("/", authenticateToken, getEmotions);

/**
 * @swagger
 * /emotions/{id}:
 *   patch:
 *     summary: "감정 기록 수정"
 *     description: "이미 기록된 감정의 이모지나 메모를 수정합니다."
 *     tags: [Emotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: "감정 ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "🙂"
 *               note:
 *                 type: string
 *                 example: "오늘은 살짝 피곤했지만 뿌듯했다."
 *     responses:
 *       200:
 *         description: "감정 수정 성공"
 *       400:
 *         description: "잘못된 요청"
 *       401:
 *         description: "인증 실패"
 *       403:
 *         description: "수정 권한 없음"
 *       404:
 *         description: "감정을 찾을 수 없음"
 *       500:
 *         description: "서버 오류"
 */
router.patch("/:id", authenticateToken, updateEmotion);

module.exports = router;