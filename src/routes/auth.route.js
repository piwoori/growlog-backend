const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware'); // ✅ 구조 분해 할당
const adminMiddleware = require('../middlewares/adminMiddleware');
const {
  signup,
  login,
  checkNickname,
  getMe,
  deleteAccount,
  getAllUsers,
  // ✅ 새로 추가
  updateProfile,
  changePassword,
} = require('../controllers/auth.controller');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: 가입 및 로그인 API
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - nickname
 *             properties:
 *               email:
 *                 type: string
 *                 example: example@email.com
 *               password:
 *                 type: string
 *                 example: yourpassword123
 *               nickname:
 *                 type: string
 *                 example: growuser
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 이메일 또는 닉네임 중복
 *       500:
 *         description: 서버 오류
 */
router.post('/signup', signup);

/**
 * @swagger
 * /auth/check-nickname:
 *   get:
 *     summary: 닉네임 중복 체크
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: nickname
 *         schema:
 *           type: string
 *         required: true
 *         description: 중복 확인할 닉네임
 *     responses:
 *       200:
 *         description: 중복 여부 반환
 *         content:
 *           application/json:
 *             example:
 *               isDuplicate: false
 *       400:
 *         description: 닉네임 미입력
 *       500:
 *         description: 서버 오류
 */
router.get('/check-nickname', checkNickname);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: example@email.com
 *               password:
 *                 type: string
 *                 example: yourpassword123
 *     responses:
 *       200:
 *         description: 로그인 성공 (JWT 토큰 반환)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: 이메일 또는 비밀번호 불일치
 *       500:
 *         description: 서버 오류
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 유저 정보 조회
 *     description: 로그인한 사용자의 정보를 반환합니다.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 유저 정보 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 5
 *                 email:
 *                   type: string
 *                   example: testfix@email.com
 *                 nickname:
 *                   type: string
 *                   example: 테스트유저
 *                 role:
 *                   type: string
 *                   example: USER
 *       401:
 *         description: 인증 실패
 */
router.get('/me', authenticateToken, getMe);

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     summary: "프로필 수정 (닉네임 변경)"
 *     description: "로그인한 사용자의 닉네임을 변경합니다."
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nickname
 *             properties:
 *               nickname:
 *                 type: string
 *                 example: growuser_jae
 *     responses:
 *       200:
 *         description: "수정된 유저 정보 반환"
 *       400:
 *         description: "닉네임 미입력"
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */
router.patch('/me', authenticateToken, updateProfile);

/**
 * @swagger
 * /auth/password:
 *   patch:
 *     summary: "비밀번호 변경"
 *     description: "현재 비밀번호를 검증하고 새 비밀번호로 변경합니다."
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldPassword123
 *               newPassword:
 *                 type: string
 *                 example: newPassword123!
 *     responses:
 *       200:
 *         description: "비밀번호 변경 성공"
 *       400:
 *         description: "현재 비밀번호 불일치 또는 유효하지 않은 요청"
 *       401:
 *         description: "인증 실패"
 *       500:
 *         description: "서버 오류"
 */
router.patch('/password', authenticateToken, changePassword);

/**
 * @swagger
 * /auth/delete:
 *   delete:
 *     summary: 회원 탈퇴
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 회원 탈퇴 성공 메시지 반환
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.delete('/delete', authenticateToken, deleteAccount);

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: 전체 유저 목록 조회 (관리자 전용)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 유저 목록 반환
 *       403:
 *         description: 관리자 권한 없음
 */
router.get('/users', authenticateToken, adminMiddleware, getAllUsers);

module.exports = router;