const express = require('express');
const sessionsController = require('../controllers/sessions.controller');
const { verifyTokenOptional, loadUserOptional, loadUserByTelegramId } = require('../middleware/auth.middleware');

const router = express.Router();

// Получение активной сессии пользователя
router.get('/active', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, sessionsController.getActiveSession);

// Получение последних позиций пользователя
router.get('/positions', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, sessionsController.getUserPositions);

// Получение текущей позиции пользователя
router.get('/current-position', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, sessionsController.getCurrentPosition);

// Создание новой сессии
router.post('/', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, sessionsController.createSession);

// Деактивация сессии
router.patch('/:id/deactivate', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, sessionsController.deactivateSession);

module.exports = router; 