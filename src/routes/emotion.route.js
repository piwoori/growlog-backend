const express = require('express');
const router = express.Router();
const {
  createEmotion,
  getEmotions,
  getEmotionById,
  updateEmotion,
} = require('../controllers/emotion.controller');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Emotions
 *   description: "감정 기록 API"
 */

/**
 * @swagger
 * /emotions:
 *   post:
 *     summary: "감정 기록 생성"
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
 *                 example: "오늘은 Growlog 기능을 많이 완성해서 뿌듯했다."
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-03"
 *                 description: "기록할 날짜 (YYYY-MM-DD). 생략 시 오늘 기준."
 *     responses:
 *       201:
 *         description: "감정 기록 성공"
 *       400:
 *         description: "잘못된 요청 (필수 값 누락 또는 날짜 형식 오류)"
 *       401:
 *         description: "인증 실패"
 *       409:
 *         description: "해당 날짜에 이미 감정이 기록된 경우"
 *       500:
 *         description: "서버 오류"
 */
router.post('/', authenticateToken, createEmotion);

/**
 * @swagger
 * /emotions:
 *   get:
 *     summary: "감정 목록 조회 (옵션: 날짜/이모지 필터)"
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
 *         description: "특정 날짜의 감정만 조회 (YYYY-MM-DD)"
 *       - in: query
 *         name: emoji
 *         required: false
 *         schema:
 *           type: string
 *         description: "특정 이모지로 필터링"
 *     responses:
 *       200:
 *         description: "감정 목록 조회 성공"
 *       400:
 *         description: "잘못된 요청 (날짜 형식 오류)"
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */
router.get('/', authenticateToken, getEmotions);

/**
 * @swagger
 * /emotions/{id}:
 *   get:
 *     summary: "감정 상세 조회"
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
 *     responses:
 *       200:
 *         description: "감정 상세 조회 성공"
 *       403:
 *         description: "권한 없음 (다른 사용자의 감정)"
 *       404:
 *         description: "감정을 찾을 수 없음"
 *       500:
 *         description: "서버 오류"
 */
router.get('/:id', authenticateToken, getEmotionById);

/**
 * @swagger
 * /emotions/{id}:
 *   patch:
 *     summary: "감정 수정"
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
 *                 example: "기분이 조금 가라앉았지만 그래도 나쁘지 않았다."
 *     responses:
 *       200:
 *         description: "감정 수정 성공"
 *       400:
 *         description: "잘못된 요청 (수정할 데이터 없음)"
 *       403:
 *         description: "권한 없음 (다른 사용자의 감정)"
 *       404:
 *         description: "감정을 찾을 수 없음"
 *       500:
 *         description: "서버 오류"
 */
router.patch('/:id', authenticateToken, updateEmotion);

module.exports = router;