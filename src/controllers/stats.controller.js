// src/controllers/stats.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/** 기준 날짜(YYYY-MM-DD 또는 없음) 기준으로 최근 7일 범위 구하기 */
const getWeeklyRange = (baseDateString) => {
    const base = baseDateString ? new Date(baseDateString) : new Date();
    if (isNaN(base.getTime())) return null;

    const end = new Date(base);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(start.getDate() - 6); // 최근 7일 (오늘 포함)

    start.setHours(0, 0, 0, 0);

    return { start, end };
};

/**
 * GET /stats/summary?date=YYYY-MM-DD&period=weekly
 * 주간 감정 분포 + 주간 할일 통계 + AI 감정 비율 요약
 */
const getSummaryStats = async (req, res) => {
    const userId = req.user.id;
    const { date, period = "weekly" } = req.query;

    if (period !== "weekly") {
        return res.status(400).json({ error: "현재는 weekly 통계만 지원합니다." });
    }

    const range = getWeeklyRange(date);
    if (!range) {
        return res
            .status(400)
            .json({ error: "날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식으로 보내주세요." });
    }

    const { start, end } = range;

    try {
        /* ----------------------- 1) 최근 7일 감정 분포 ----------------------- */
        const emotions = await prisma.emotion.findMany({
            where: {
                userId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
        });

        const emotionStats = emotions.reduce((acc, e) => {
            if (!e.emoji) return acc;
            acc[e.emoji] = (acc[e.emoji] || 0) + 1;
            return acc;
        }, {});

        /* ----------------------- 2) 최근 7일 할 일 통계 ---------------------- */
        const todos = await prisma.todo.findMany({
            where: {
                userId,
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
        });

        const totalTodos = todos.length;
        const completedTodos = todos.filter((t) => t.isDone).length;
        const completionRate =
            totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

        const todoStats = {
            total: totalTodos,
            completed: completedTodos,
            completionRate,
        };

        /* ---------------- 3) AI 기반 감정 비율 (최소 1개부터) ---------------- */
        const aiEmotions = emotions.filter(
            (e) =>
                e.aiLabel !== null ||
                e.positive !== null ||
                e.neutral !== null ||
                e.negative !== null
        );

        const aiSampleCount = aiEmotions.length;

        let aiAggregate = {
            positive: 0,
            neutral: 0,
            negative: 0,
        };

        if (aiSampleCount > 0) {
            let posSum = 0;
            let neuSum = 0;
            let negSum = 0;

            aiEmotions.forEach((e) => {
                posSum += e.positive ?? 0;
                neuSum += e.neutral ?? 0;
                negSum += e.negative ?? 0;
            });

            const totalProb = posSum + neuSum + negSum;

            if (totalProb > 0) {
                const pos = (posSum / totalProb) * 100;
                const neu = (neuSum / totalProb) * 100;
                const neg = (negSum / totalProb) * 100;

                // 라운딩하면서 100% 근처가 되게 보정
                const roundedPos = Math.round(pos);
                const roundedNeu = Math.round(neu);
                let roundedNeg = 100 - roundedPos - roundedNeu;
                if (roundedNeg < 0) roundedNeg = 0;

                aiAggregate = {
                    positive: roundedPos,
                    neutral: roundedNeu,
                    negative: roundedNeg,
                };
            }
        }

        return res.status(200).json({
            emotionStats,
            todoStats,
            aiAggregate,
            aiSampleCount,
            period: "weekly",
            range: {
                start,
                end,
            },
        });
    } catch (error) {
        console.error("❌ 통계 요약 조회 오류:", error);
        return res.status(500).json({ error: "통계 요약 조회 중 오류가 발생했습니다." });
    }
};

module.exports = {
    getSummaryStats,
};