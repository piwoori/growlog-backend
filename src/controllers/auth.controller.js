require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'growlog-secret';

// 회원가입
exports.signup = async (req, res) => {
  const { email, password, nickname } = req.body;

  // 관리자 계정 생성 방지
  if (req.body.role && req.body.role.toUpperCase() === 'ADMIN') {
    return res.status(403).json({ message: '권한 설정은 허용되지 않습니다.' });
  }

  try {
    // 이메일 중복 검사
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: '이미 존재하는 이메일입니다.' });
    }

    // 닉네임 중복 검사
    const existingNickname = await prisma.user.findUnique({ where: { nickname } });
    if (existingNickname) {
      return res.status(409).json({ message: '이미 존재하는 닉네임입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, nickname, role: 'USER' },
    });

    res.status(201).json({ message: '회원가입 성공', userId: newUser.id });
  } catch (err) {
    console.error('🔥 회원가입 실패:', err);
    res.status(500).json({ message: '회원가입 실패', error: err.message });
  }
};

// 닉네임 중복 확인
exports.checkNickname = async (req, res) => {
  const { nickname } = req.query;

  if (!nickname) {
    return res.status(400).json({ message: '닉네임을 입력해주세요.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { nickname } });
    res.json({ isDuplicate: !!existingUser });
  } catch (err) {
    console.error('닉네임 중복 체크 오류:', err);
    res.status(500).json({ message: '서버 오류' });
  }
};

// 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: '존재하지 않는 이메일입니다.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: '로그인 성공', token });
  } catch (err) {
    res.status(500).json({ error: '서버 오류', detail: err.message });
  }
};

// 내 정보 조회
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    });
  } catch (err) {
    console.error('GetMe Error:', err);
    res.status(500).json({ error: '서버 오류', detail: err.message });
  }
};

// 프로필 수정 (닉네임 변경)
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { nickname } = req.body;

  if (!nickname || !nickname.trim()) {
    return res.status(400).json({ message: '닉네임을 입력해주세요.' });
  }

  try {
    const trimmedNickname = nickname.trim();

    // 닉네임 중복 체크 (본인 제외)
    const existingUser = await prisma.user.findUnique({
      where: { nickname: trimmedNickname },
    });

    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { nickname: trimmedNickname },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
      },
    });

    return res.status(200).json({
      message: '프로필이 수정되었습니다.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('🔥 프로필 수정 실패:', err);
    return res.status(500).json({
      message: '프로필 수정 실패',
      error: err.message,
    });
  }
};

// 비밀번호 변경
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
        .status(400)
        .json({ message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
  }

  if (currentPassword === newPassword) {
    return res
        .status(400)
        .json({ message: '현재 비밀번호와 새 비밀번호가 같습니다.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
          .status(400)
          .json({ message: '현재 비밀번호가 일치하지 않습니다.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return res
        .status(200)
        .json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (err) {
    console.error('🔥 비밀번호 변경 실패:', err);
    return res.status(500).json({
      message: '비밀번호 변경 실패',
      error: err.message,
    });
  }
};

// 회원 탈퇴
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.user.delete({ where: { id: userId } });
    res.status(200).json({ message: '회원 탈퇴가 완료되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '서버 오류', detail: err.message });
  }
};

// 전체 유저 목록 조회 (관리자용)
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
      },
    });
    res.status(200).json(users);
  } catch (err) {
    console.error('📛 전체 유저 조회 실패:', err);
    res.status(500).json({ message: '유저 목록 조회 실패', detail: err.message });
  }
};