const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Регистрация и аутентификация
router.post('/register/email', authController.registerByEmail);
router.post('/register/invite', authController.registerByInviteCode);
router.post('/register/telegram', authController.registerByTelegram);
router.post('/validate-invite', authController.validateInviteCode);
router.post('/login/email', authController.loginByEmail);
router.post('/login/telegram', authController.loginByTelegram);

// Telegram Web App
router.post('/check-telegram-user', authController.checkTelegramUser);
router.post('/telegram-web-app', authController.telegramWebAppAuth);

// Управление токенами
router.post('/refresh', authController.refreshToken);
router.post('/logout', authMiddleware.verifyToken, authController.logout);

// Профиль пользователя
router.get('/profile', authMiddleware.verifyTokenOptional, authMiddleware.loadUserOptional, authMiddleware.loadUserByTelegramId, authController.getProfile);

module.exports = router; 