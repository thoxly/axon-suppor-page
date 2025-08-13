const express = require('express');
const router = express.Router();
const { verifyToken, loadUser, checkManagerOnboarding } = require('../middleware/auth.middleware');
const companiesController = require('../controllers/companies.controller');

// Маршруты, требующие авторизации через токен
router.post('/', verifyToken, loadUser, checkManagerOnboarding, companiesController.createCompany);
router.get('/:id', verifyToken, loadUser, companiesController.getCompanyById);
router.put('/:id', verifyToken, loadUser, checkManagerOnboarding, companiesController.updateCompany);

module.exports = router; 