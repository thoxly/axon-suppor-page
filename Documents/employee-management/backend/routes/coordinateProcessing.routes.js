const express = require('express');
const coordinateProcessingController = require('../controllers/coordinateProcessing.controller');
const { verifyTokenOptional, loadUserOptional, loadUserByTelegramId } = require('../middleware/auth.middleware');

const router = express.Router();

// Получить обработанные координаты сессии
router.get('/sessions/:sessionId/coordinates', 
    verifyTokenOptional, 
    loadUserOptional, 
    loadUserByTelegramId, 
    coordinateProcessingController.getSessionProcessedCoordinates
);

// Получить статистику сессии
router.get('/sessions/:sessionId/stats', 
    verifyTokenOptional, 
    loadUserOptional, 
    loadUserByTelegramId, 
    coordinateProcessingController.getSessionStats
);

// Получить обработанные координаты задачи
router.get('/tasks/:taskId/coordinates', 
    verifyTokenOptional, 
    loadUserOptional, 
    loadUserByTelegramId, 
    coordinateProcessingController.getTaskProcessedCoordinates
);

// Получить обработанные координаты сессий за период
router.get('/sessions/period', 
    verifyTokenOptional, 
    loadUserOptional, 
    loadUserByTelegramId, 
    coordinateProcessingController.getSessionsProcessedCoordinates
);

// Получить статистику задачи
router.get('/tasks/:taskId/stats', 
    verifyTokenOptional, 
    loadUserOptional, 
    loadUserByTelegramId, 
    coordinateProcessingController.getTaskStats
);

// Получить настройки обработки координат
router.get('/settings', 
    verifyTokenOptional, 
    loadUserOptional, 
    loadUserByTelegramId, 
    coordinateProcessingController.getProcessingSettings
);

// Обновить настройки обработки координат (только для менеджеров)
router.put('/settings', 
    verifyTokenOptional, 
    loadUserOptional, 
    loadUserByTelegramId, 
    coordinateProcessingController.updateProcessingSettings
);

module.exports = router; 