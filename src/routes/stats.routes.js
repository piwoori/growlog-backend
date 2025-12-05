const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');

const {
    getEmotionStats,
    getTodoStats,
    getSummaryStats,
} = require('../controllers/stats.controller');

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: "통계 API"
 */

router.get('/emotions', authenticateToken, getEmotionStats);
router.get('/todos', authenticateToken, getTodoStats);
router.get('/summary', authenticateToken, getSummaryStats);

module.exports = router;