// src/routes/stats.routes.js
const express = require("express");
const router = express.Router();
const { getSummaryStats } = require("../controllers/stats.controller");
const { authenticateToken } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: 통계 API
 */

/**
 * @swagger
 * /stats/summary:
 *   get:
 *     summary: "주간 감정·할 일 통계 조회"
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: "기준 날짜(YYYY-MM-DD). 기본값은 오늘."
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [weekly]
 *         description: "통계 기간 (현재 weekly만 지원)"
 *     responses:
 *       200:
 *         description: "통계 조회 성공"
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */
router.get("/summary", authenticateToken, getSummaryStats);

module.exports = router;