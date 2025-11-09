// src/middlewares/ensureUserExists.js
const prisma = require("../lib/prisma");

module.exports = async (req, res, next) => {
  try {
    if (!req.user?.id) return next();
    const uid = req.user.id;
    const existing = await prisma.user.findUnique({ where: { id: uid } });
    if (!existing) {
      // 필요한 최소 필드만 채워 생성 (스키마에 맞게 필드명 수정)
      await prisma.user.create({
        data: {
          id: uid,
          email: `dummy+${uid}@example.com`,
          password: "dummy", // 해시 아님. 테스트/개발용만!
          // nickname 등 NOT NULL 필드가 있으면 추가
        },
      });
    }
    next();
  } catch (e) {
    next(e);
  }
};