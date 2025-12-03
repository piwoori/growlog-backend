const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * YYYY-MM-DD 문자열을 DateTime 범위(gte ~ lt)로 변환
 */
const getDateRange = (dateString) => {
  const base = new Date(dateString);
  if (isNaN(base.getTime())) {
    return null;
  }
  const nextDay = new Date(base);
  nextDay.setDate(nextDay.getDate() + 1);

  return { start: base, end: nextDay };
};

/**
 * GET /daily?date=YYYY-MM-DD
 * 감정 + 회고 + 할 일 + 할 일 통계 한번에 반환
 */
const getDailySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    // date 없으면 오늘 기준
    const todayString = new Date().toISOString().slice(0, 10);
    const target = date || todayString;

    const range = getDateRange(target);
    if (!range) {
      return res
          .status(400)
          .json({ error: '잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 보내주세요.' });
    }

    const { start, end } = range;

    // Emotion / Reflection / Todo를 병렬로 조회
    const [emotion, reflection, todos] = await Promise.all([
      prisma.emotion.findFirst({
        where: {
          userId,
          date: {
            gte: start,
            lt: end,
          },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.reflection.findFirst({
        where: {
          userId,
          date: {
            gte: start,
            lt: end,
          },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.todo.findMany({
        where: {
          userId,
          // Todo에 날짜가 있다면 여기도 범위 조건 추가
          // 예: dueDate 또는 date 같은 필드가 있으면 사용
          // date: { gte: start, lt: end },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // 할 일 통계 계산
    const totalTodos = todos.length;
    const completedTodos = todos.filter((t) => t.isDone).length;
    const completionRate =
        totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

    return res.status(200).json({
      date: target,
      emotion, // null 가능
      reflection, // null 가능
      todos,
      todoSummary: {
        total: totalTodos,
        completed: completedTodos,
        completionRate, // 0~100 정수
      },
    });
  } catch (error) {
    console.error('❌ 일간 요약 조회 오류:', error);
    return res
        .status(500)
        .json({ error: '일간 요약 조회 중 오류가 발생했습니다.' });
  }
};

module.exports = { getDailySummary };