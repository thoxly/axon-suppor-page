import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Telegram as TelegramIcon,
} from '@mui/icons-material';
import { useAuthContext } from '../context/AuthContext';
import EmployeesTable from '../components/Employees/EmployeesTable';
import EmployeeFormOffcanvas from '../components/Employees/EmployeeFormOffcanvas';
import InviteEmployeeModal from '../components/Employees/InviteEmployeeModal';
import ResendInviteModal from '../components/Employees/ResendInviteModal';
import DeleteConfirmModal from '../components/Employees/DeleteConfirmModal';
import TableSkeleton from '../components/common/TableSkeleton';
import { api } from '../utils/api';

const EmployeesPage = () => {
  const { isManager, user } = useAuthContext();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Отладочная информация
  console.log('Current user:', user);
  console.log('Is manager:', isManager());
  const [showForm, setShowForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeToResend, setEmployeeToResend] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // Моковые данные для руководителей (в реальном приложении будут загружаться с сервера)
  const managers = [
    { id: 1, full_name: 'Иван Петров' },
    { id: 2, full_name: 'Мария Сидорова' },
    { id: 3, full_name: 'Алексей Козлов' },
  ];

  const handleAdd = () => {
    setShowInviteModal(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleResendInvite = (employee) => {
    setEmployeeToResend(employee);
    setShowResendModal(true);
  };

  const handleDelete = (employee) => {
    // Дополнительная проверка - нельзя удалить самого себя
    if (user?.id === employee.id) {
      console.warn('Cannot delete yourself');
      return;
    }
    setEmployeeToDelete(employee);
    setShowDelete(true);
  };

  const handleFormSubmit = async (employee) => {
    try {
      if (editingEmployee) {
        const updatedEmployee = await api.employees.update(employee.id, employee);
        setEmployees(employees.map((e) => (e.id === employee.id ? updatedEmployee.employee : e)));
      }
      setShowForm(false);
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  // Загрузка сотрудников с сервера
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.employees.getAll();
      setEmployees(data.employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSuccess = () => {
    // Обновляем список сотрудников после приглашения
    fetchEmployees();
  };

  const handleResendSuccess = () => {
    // Обновляем список сотрудников после повторной отправки
    fetchEmployees();
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.employees.delete(employeeToDelete.id);
      setEmployees(employees.filter((e) => e.id !== employeeToDelete.id));
      setShowDelete(false);
    } catch (error) {
      console.error('Error deleting employee:', error);
      // Показываем сообщение об ошибке пользователю
      if (error.message) {
        alert(error.message);
      } else {
        alert('Ошибка при удалении сотрудника');
      }
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Paper sx={{ width: '100%', overflow: 'hidden', maxWidth: '100%' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
              Сотрудники
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <TableSkeleton 
              rows={6} 
              columns={5} 
              avatarInFirstColumn={true}
              chipInColumn={3}
            />
          </Box>
        </Paper>
      );
    }

    if (employees.length === 0) {
      return (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: 'background.subtle',
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Нет добавленных сотрудников
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Добавьте своего первого сотрудника, чтобы начать работу
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ px: 4 }}
          >
            Добавить сотрудника
          </Button>
        </Paper>
      );
    }

    return (
      <Paper sx={{ width: '100%', overflow: 'hidden', maxWidth: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
            Сотрудники
          </Typography>
        </Box>
        <EmployeesTable
          employees={employees}
          onEdit={handleEdit}
          onDelete={handleDelete}
          actionButtons={(employee) => {
            console.log('Rendering actions for employee:', employee);
            console.log('Current user ID:', user?.id);
            console.log('Employee ID:', employee.id);
            console.log('Should show delete button:', user?.id !== employee.id);
            
            return (
              <>
                {employee.status === 'pending' ? (
                  <Tooltip title="Повторно отправить приглашение">
                    <IconButton
                      size="small"
                      onClick={() => handleResendInvite(employee)}
                      sx={{ color: 'warning.main' }}
                    >
                      <TelegramIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Редактировать">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(employee)}
                      sx={{ color: 'primary.main' }}
                    >
                      <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {/* Показываем кнопку удаления только если это не текущий пользователь */}
              {user?.id !== employee.id && (
                <Tooltip title="Удалить">
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(employee)}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          );
        }}
        />
      </Paper>
    );
  };

  return (
    <Box sx={{ py: 3, px: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Сотрудники
        </Typography>
        {employees.length > 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Добавить
          </Button>
        )}
      </Box>

      {renderContent()}

      <EmployeeFormOffcanvas
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        initialData={editingEmployee}
        managers={managers}
      />

      <InviteEmployeeModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />

      <ResendInviteModal
        show={showResendModal}
        onClose={() => setShowResendModal(false)}
        onSuccess={handleResendSuccess}
        employee={employeeToResend}
      />
      
      <DeleteConfirmModal
        show={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteConfirm}
        employee={employeeToDelete}
        currentUserId={user?.id}
      />
    </Box>
  );
};

export default EmployeesPage; 