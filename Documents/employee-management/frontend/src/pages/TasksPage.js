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
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import TasksTable from '../components/Tasks/TasksTable';
import TaskFormOffcanvas from '../components/Tasks/TaskFormOffcanvas';
import DeleteConfirmModal from '../components/Tasks/DeleteConfirmModal';
import TaskConfirmationModal from '../components/Tasks/TaskConfirmationModal';
import TableSkeleton from '../components/common/TableSkeleton';
import { api } from '../utils/api';

const TasksPage = () => {
  console.log('TasksPage mounted');
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [taskToConfirm, setTaskToConfirm] = useState(null);
  const [error, setError] = useState(null);

  const handleAdd = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = (task) => {
    setTaskToDelete(task);
    setShowDelete(true);
  };

  const handleFormSubmit = async (taskData) => {
    try {
      if (editingTask) {
        await api.tasks.update(editingTask.id, taskData);
      } else {
        await api.tasks.create(taskData);
      }
      
      // Refresh the task list
      await fetchTasks();
      
      // Close the form and reset editing state
      setShowForm(false);
      setEditingTask(null);
      setError(null);
    } catch (error) {
      console.error('Error saving task:', error);
      setError('Не удалось сохранить задачу. Пожалуйста, попробуйте еще раз.');
      throw error; // Propagate error to form component
    }
  };


  const handleConfirmComplete = (task) => {
    setTaskToConfirm(task);
    setShowConfirmation(true);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      console.log('Fetching tasks...');
      const response = await api.tasks.getAll();
      console.log('Tasks fetched:', response);
      
      // Логируем статусы всех задач для отладки
      const uniqueStatuses = new Set();
      response.forEach(task => {
        uniqueStatuses.add(task.status);
      });
      console.log('All unique statuses in the system:', Array.from(uniqueStatuses));
      
      setTasks(response);
      setError(null);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Не удалось загрузить задачи. Пожалуйста, попробуйте еще раз.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.tasks.delete(taskToDelete.id);
      setTasks(tasks.filter((t) => t.id !== taskToDelete.id));
      setShowDelete(false);
      setTaskToDelete(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Не удалось удалить задачу. Пожалуйста, попробуйте еще раз.');
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    setTaskToConfirm(null);
  };

  const handleTaskUpdated = () => {
    fetchTasks(); // Перезагружаем список задач после обновления статуса
  };



  const renderContent = () => {
    if (loading) {
      return (
        <Paper sx={{ width: '100%', overflow: 'hidden', maxWidth: '100%' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
              Задачи
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <TableSkeleton 
              rows={6} 
              columns={7} 
              chipInColumn={3}
            />
          </Box>
        </Paper>
      );
    }

    if (tasks.length === 0) {
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
            Нет добавленных задач
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Добавьте свою первую задачу, чтобы начать работу
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ px: 4 }}
          >
            Добавить задачу
          </Button>
        </Paper>
      );
    }

    return (
      <Paper sx={{ width: '100%', overflow: 'hidden', maxWidth: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" component="div" sx={{ flex: '1 1 100%' }}>
            Задачи
          </Typography>
        </Box>
        {error && (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        )}
        <TasksTable
          tasks={tasks}
          onEdit={handleEdit}
          onDelete={handleDelete}
          actionButtons={(task) => {
            // Определяем, можно ли редактировать задачу
            const editableStatuses = ['not-assigned', 'assigned', 'accepted'];
            const canEdit = editableStatuses.includes(task.status);
            
            return (
              <>
                {canEdit && (
                  <Tooltip title="Редактировать">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(task)}
                      sx={{ color: 'primary.main' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {task.status === 'completed' && (
                  <Tooltip title="Проверить выполнение">
                    <IconButton
                      size="small"
                      onClick={() => handleConfirmComplete(task)}
                      sx={{ color: 'success.main' }}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Удалить">
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(task)}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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
          Задачи
        </Typography>
        {tasks.length > 0 && (
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

      <TaskFormOffcanvas
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
        task={editingTask}
      />

      <DeleteConfirmModal
        open={showDelete}
        onClose={() => {
          setShowDelete(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Удалить задачу?"
        content="Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить."
      />

      <TaskConfirmationModal
        open={showConfirmation}
        onClose={handleConfirmationClose}
        task={taskToConfirm}
        onTaskUpdated={handleTaskUpdated}
      />
    </Box>
  );
};

export default TasksPage; 