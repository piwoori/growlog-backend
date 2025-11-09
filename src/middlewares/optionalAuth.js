// src/middlewares/optionalAuth.js
module.exports = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      // JWT 검증 로직을 authMiddleware.js에서 복사해서 붙여도 됨
      // 예시:
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // req.user = decoded;
    }
  } catch (err) {
    // 토큰이 없거나 잘못되어도 그냥 통과
    console.warn("optionalAuth skipped:", err.message);
  }
  next();
};