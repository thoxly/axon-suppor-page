import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Telegram } from '@mui/icons-material';
import { api } from '../../utils/api';
import { useAuthContext } from '../../context/AuthContext';

const InviteEmployeeModal = ({ show, onClose, onSuccess }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCodeGenerated, setIsCodeGenerated] = useState(false);
  const { user } = useAuthContext();

  useEffect(() => {
    if (show && !isCodeGenerated) {
      generateInviteCode();
    }
  }, [show, isCodeGenerated]);

  const generateInviteCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const data = await api.employees.generateInvite();
      setInviteCode(data.invite_code);
      setIsCodeGenerated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Сохраняем инвайт-код в базе данных вместе с ID текущего пользователя как manager_id
      await api.employees.invite({
        username: `user_${Date.now()}`, // Временный username, будет обновлен при регистрации
        invite_code: inviteCode,
        manager_id: user.id // Добавляем ID текущего пользователя как manager_id
      });

      setSuccess('Инвайт-код успешно сохранен в системе!');

      // Отправляем приглашение через Telegram Web App API
      const text = encodeURIComponent(
        `Привет! Ваш код авторизации:\n${inviteCode}\n\nПерейдите в бота 👉 @arrived_rf_bot и нажмите "Start".\nБот попросит ввести код — введите его, чтобы подключиться к системе.`
      );
      
      const tgLink = `tg://msg_url?url=&text=${text}`;
      const shareLink = `https://t.me/share/url?url=&text=${text}`;
      
      // Пытаемся открыть Telegram приложение
      try {
        window.location.href = tgLink;
      } catch (e) {
        // Если не удалось открыть приложение, открываем веб-версию
        window.open(shareLink, '_blank');
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setError('');
    setSuccess('');
    setLoading(false);
    setIsCodeGenerated(false);
    onClose();
  };

  return (
    <Dialog 
      open={show} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Telegram sx={{ color: 'primary.main' }} />
          <Typography variant="h6">
            Пригласить сотрудника
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Сгенерированный инвайт-код для приглашения сотрудника. При нажатии кнопки "Отправить приглашение" код будет сохранен в системе и откроется Telegram с готовым текстом для отправки.
        </Typography>

        {loading && !isCodeGenerated ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Генерация инвайт-кода...
            </Typography>
          </Box>
        ) : inviteCode && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Инвайт-код для приглашения:
            </Typography>
            <Chip
              label={inviteCode}
              variant="outlined"
              sx={{ 
                fontFamily: 'monospace', 
                fontSize: '1.1rem',
                fontWeight: 600,
                backgroundColor: 'background.paper',
                borderColor: 'primary.main',
                color: 'primary.main',
              }}
            />
          </Box>
        )}

        <Typography variant="body2" color="text.secondary">
          После нажатия "Отправить приглашение" инвайт-код будет сохранен в системе и откроется Telegram с готовым текстом для отправки пользователю.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !inviteCode}
          startIcon={loading ? <CircularProgress size={16} /> : <Telegram />}
        >
          {loading ? 'Сохранение и отправка...' : 'Отправить приглашение'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteEmployeeModal; 