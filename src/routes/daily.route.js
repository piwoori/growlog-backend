const express = require('express');
const router = express.Router();
const { getDailySummary } = require('../controllers/daily.controller');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Daily
 *   description: "하루 요약 API (회고/감정/할 일 통합 조회)"
 */

/**
 * @swagger
 * /daily:
 *   get:
 *     summary: "하루 요약 조회 (회고/감정/할 일/달성률)"
 *     tags: [Daily]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: "조회할 날짜 (YYYY-MM-DD). 생략 시 오늘 기준."
 *     responses:
 *       200:
 *         description: "하루 요약 조회 성공"
 *       400:
 *         description: "잘못된 요청 (날짜 형식 오류 등)"
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */
router.get('/', authenticateToken, getDailySummary);

module.exports = router;