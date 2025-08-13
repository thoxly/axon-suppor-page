const express = require('express');
const router = express.Router();
const { verifyToken, verifyTokenOptional, loadUser, loadUserOptional, loadUserByTelegramId, checkManagerOnboarding } = require('../middleware/auth.middleware');
const tasksController = require('../controllers/tasks.controller');
const { uploadTaskPhotos } = require('../utils/fileUpload');

// Маршруты, требующие авторизации через токен
router.post('/', verifyToken, loadUser, checkManagerOnboarding, tasksController.createTask);
router.put('/:id', verifyToken, loadUser, checkManagerOnboarding, tasksController.updateTask);
router.delete('/:id', verifyToken, loadUser, checkManagerOnboarding, tasksController.deleteTask);

// Маршруты, поддерживающие авторизацию через telegram_id И/ИЛИ Bearer токен
router.get('/', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, tasksController.getTasks);
router.get('/mini-app', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, tasksController.getTasksForMiniApp);
router.get('/:id', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, tasksController.getTaskById);
router.patch('/:id/status', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, tasksController.updateTaskStatus);

// Новые маршруты для Telegram Mini App
router.patch('/:id/accept-assigned', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, tasksController.acceptAssignedTask);
router.patch('/:id/take-free', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, tasksController.takeFreeTask);
router.patch('/:id/start-work', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, tasksController.startWork);
router.post('/:id/complete', verifyTokenOptional, loadUserOptional, loadUserByTelegramId, uploadTaskPhotos, tasksController.completeTask);

module.exports = router; 