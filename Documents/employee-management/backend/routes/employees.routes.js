const express = require('express');
const router = express.Router();
const { verifyToken, loadUser, checkManagerOnboarding } = require('../middleware/auth.middleware');
const employeesController = require('../controllers/employees.controller');

router.post('/invite', verifyToken, loadUser, checkManagerOnboarding, employeesController.inviteEmployee);
router.post('/generate-invite', verifyToken, loadUser, checkManagerOnboarding, employeesController.generateInvite);
router.get('/', verifyToken, loadUser, employeesController.getEmployees);
router.put('/:id', verifyToken, loadUser, checkManagerOnboarding, employeesController.updateEmployee);
router.delete('/:id', verifyToken, loadUser, checkManagerOnboarding, employeesController.deleteEmployee);
router.get('/:id/positions', verifyToken, loadUser, employeesController.getEmployeePositions);

module.exports = router; 