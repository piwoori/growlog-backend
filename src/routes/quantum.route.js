const router = require("express").Router();
const ai = require("../utils/aiClient");

/**
 * @swagger
 * /quantum/simulate:
 *   post:
 *     summary: "양자 감정 파동 시뮬레이션 (AI 프록시)"
 *     tags: ["Quantum"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: "text 또는 probs 중 하나 지정"
 *             example:
 *               text: "오늘은 피곤했지만 뿌듯하다."
 *               duration: 10
 *               dt: 0.1
 *               coherence: 0.8
 *     responses:
 *       200:
 *         description: "시뮬레이션 결과"
 */
router.post("/simulate", async (req, res) => {
  try {
    const { data, status } = await ai.post("/quantum/simulate", req.body);
    return res.status(status).json(data);
  } catch (e) {
    console.error("quantum proxy error:", e?.response?.data || e.message);
    return res.status(500).json({ message: "quantum proxy error" });
  }
});

module.exports = router;