import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
} from '@mui/material';
import { Person } from '@mui/icons-material';

const DeleteConfirmModal = ({ show, onClose, onConfirm, employee, currentUserId }) => {
  if (!employee) return null;

  // Проверяем, не пытается ли пользователь удалить самого себя
  const isDeletingSelf = currentUserId === employee.id;

  return (
    <Dialog open={show} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Удалить сотрудника</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            src={employee.photo_url}
            sx={{ width: 48, height: 48 }}
          >
            <Person />
          </Avatar>
          <Box>
            <Typography variant="h6">
              {employee.full_name || 'Не указано'}
            </Typography>
            <Typography color="text.secondary">
              {employee.username ? `@${employee.username}` : 'Ник не указан'}
            </Typography>
          </Box>
        </Box>
        {isDeletingSelf ? (
          <Typography color="error" sx={{ mb: 2 }}>
            Вы не можете удалить свою собственную учетную запись.
          </Typography>
        ) : (
          <Typography>
            Вы уверены, что хотите удалить этого сотрудника? Это действие нельзя отменить.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        {!isDeletingSelf && (
          <Button onClick={onConfirm} color="error" variant="contained">
            Удалить
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmModal; 