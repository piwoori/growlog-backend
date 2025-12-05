const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * YYYY-MM-DD → 해당 기간(start ~ end)을 반환
 * period: daily | weekly | monthly
 */
const getDateRange = (dateString, period = "daily") => {
    const base = new Date(dateString);
    if (isNaN(base.getTime())) return null;

    const start = new Date(base);
    const end = new Date(base);

    if (period === "daily") {
        end.setDate(end.getDate() + 1);
    }

    if (period === "weekly") {
        const day = base.getDay(); // 일요일0, 월1...
        start.setDate(base.getDate() - day); // 주 시작(일요일 기준)
        end.setDate(start.getDate() + 7);
    }

    if (period === "monthly") {
        start.setDate(1);
        end.setMonth(start.getMonth() + 1);
    }

    return { start, end };
};

/**
 * 📌 감정 통계 (이모지별 카운트)
 * GET /stats/emotions?period=weekly&date=YYYY-MM-DD
 */
const getEmotionStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date, period = "daily" } = req.query;

        if (!date) {
            return res.status(400).json({ error: "date는 필수 파라미터입니다." });
        }

        const range = getDateRange(date, period);
        if (!range) {
            return res.status(400).json({ error: "잘못된 날짜 형식입니다." });
        }

        const { start, end } = range;

        const emotions = await prisma.emotion.findMany({
            where: {
                userId,
                date: { gte: start, lt: end },
            },
        });

        // 이모지별 카운트
        const counts = {};
        emotions.forEach((e) => {
            counts[e.emoji] = (counts[e.emoji] || 0) + 1;
        });

        return res.status(200).json({
            period,
            startDate: start,
            endDate: end,
            counts,
        });
    } catch (error) {
        console.error("❌ 감정 통계 오류:", error);
        return res.status(500).json({ error: "감정 통계 조회 중 오류 발생" });
    }
};

/**
 * 📌 할 일 통계 (완료율)
 * GET /stats/todos?period=weekly&date=YYYY-MM-DD
 */
const getTodoStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date, period = "daily" } = req.query;

        const range = getDateRange(date, period);
        if (!range) return res.status(400).json({ error: "잘못된 날짜입니다." });
        const { start, end } = range;

        // 만약 Todo에 date 필드 있으면 여기에 날짜 조건 넣어도 됨
        const todos = await prisma.todo.findMany({
            where: {
                userId,
            },
        });

        const total = todos.length;
        const completed = todos.filter((t) => t.isDone).length;

        return res.status(200).json({
            period,
            total,
            completed,
            completionRate: total ? Math.round((completed / total) * 100) : 0,
        });
    } catch (error) {
        console.error("❌ 할 일 통계 오류:", error);
        return res.status(500).json({ error: "할 일 통계 조회 중 오류 발생" });
    }
};

/**
 * 📌 통합 통계 (감정 + 할 일)
 * GET /stats/summary?period=monthly&date=YYYY-MM-DD
 */
const getSummaryStats = async (req, res) => {
    try {
        const { date, period = "daily" } = req.query;

        if (!date) {
            return res.status(400).json({ error: "date는 필수 파라미터입니다." });
        }

        // 내부 컨트롤러 재사용을 위해 mock response 사용
        let emotionResult, todoResult;

        // 감정 통계 호출
        await getEmotionStats(
            { user: req.user, query: { date, period } },
            { status: () => ({ json: (v) => (emotionResult = v) }) }
        );

        // 할 일 통계 호출
        await getTodoStats(
            { user: req.user, query: { date, period } },
            { status: () => ({ json: (v) => (todoResult = v) }) }
        );

        return res.status(200).json({
            emotionStats: emotionResult?.counts || {},
            todoStats: {
                completed: todoResult?.completed ?? 0,
                total: todoResult?.total ?? 0,
                completionRate: todoResult?.completionRate ?? 0,
            },
        });
    } catch (error) {
        console.error("❌ 통합 통계 오류:", error);
        return res.status(500).json({ error: "통합 통계 조회 중 오류 발생" });
    }
};

module.exports = {
    getEmotionStats,
    getTodoStats,
    getSummaryStats,
};