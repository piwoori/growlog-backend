// src/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");

const authRouter = require("./routes/auth.route");
const todoRouter = require("./routes/todo.route");
const reflectionRouter = require("./routes/reflection.route");
const emotionRouter = require("./routes/emotion.route");
const dailyRouter = require("./routes/daily.route"); // 날짜별 회고 & 감정 조회
const quantumRouter = require("./routes/quantum.route"); // AI 프록시
const statsRouter = require("./routes/stats.routes");

const { authenticateToken } = require("./middlewares/authMiddleware");

dotenv.config();

const app = express();

/* -------------------------- 기본 미들웨어 -------------------------- */
app.use(
  cors({
    origin: process.env.FRONT_ORIGIN || true, // 시연 중이면 true, 배포 시 특정 도메인으로 제한
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());

/* ---------------------------- Health ----------------------------- */
// 공개 헬스체크
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
    env: process.env.NODE_ENV || "dev",
  });
});

/* --------------------------- Swagger UI -------------------------- */
// Swagger 자동 토큰 주입
const swaggerToken = `${process.env.SWAGGER_SAMPLE_TOKEN || ""}`;
const swaggerOptions = {
  swaggerOptions: {
    authAction: {
      bearerAuth: {
        name: "bearerAuth",
        schema: {
          type: "http",
          in: "header",
          name: "Authorization",
          scheme: "bearer",
        },
        value: swaggerToken,
      },
    },
  },
};
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

/* ----------------------------- 라우터 ----------------------------- */
app.use("/auth", authRouter);
app.use("/todos", authenticateToken, todoRouter);
app.use("/reflections", reflectionRouter); // 필요하면 authenticateToken 추가
app.use("/emotions", emotionRouter);
app.use("/daily", dailyRouter);
app.use("/quantum", quantumRouter); // 공개 프록시(시연용). 운영시 권한 보호 고려
app.use("/stats", authenticateToken, statsRouter);

/* --------------------------- 기본 라우트 --------------------------- */
app.get("/", (req, res) => {
  res.send("🪴 Welcome to Growlog API!");
});

/* ------------------------- 에러/404 핸들러 ------------------------ */
// 404
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// 공통 에러 핸들러
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

module.exports = app;