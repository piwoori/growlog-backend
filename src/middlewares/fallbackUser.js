// src/middlewares/fallbackUser.js
module.exports = (req, _res, next) => {
  if (!req.user) {
    req.user = { id: 1 }; // 토큰 없는 경우 기본 유저
  }
  next();
};