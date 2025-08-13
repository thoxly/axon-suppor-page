import React, { useState } from 'react';
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
import { Telegram, ContentCopy } from '@mui/icons-material';

const ResendInviteModal = ({ show, onClose, onSuccess, employee }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const handleResendInvite = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setCopied(false);

    try {
      // Формируем текст для отправки через Telegram
      const text = encodeURIComponent(
        `Привет! Ваш код авторизации:\n${employee.invite_code}\n\nПерейдите в бота 👉 @arrived_rf_bot и нажмите "Start".\nБот попросит ввести код — введите его, чтобы подключиться к системе.`
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

      // Не показываем сообщение об успехе, так как мы не можем гарантировать отправку
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ошибка при открытии Telegram');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(employee.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Не удалось скопировать код');
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    setLoading(false);
    setCopied(false);
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
          Отправить приглашение повторно
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
          Отправить приглашение сотруднику {employee?.full_name || employee?.username || 'Неизвестно'} повторно.
        </Typography>

        {employee?.invite_code && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Инвайт-код для приглашения:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={employee.invite_code}
                variant="outlined"
                sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  backgroundColor: 'background.paper',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  flex: 1,
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopy />}
                onClick={handleCopyCode}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                {copied ? 'Скопировано!' : 'Копировать'}
              </Button>
            </Box>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Варианты отправки:</strong>
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            1. <strong>Автоматически:</strong> Нажмите "Открыть Telegram" - откроется приложение с готовым текстом
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            2. <strong>Вручную:</strong> Скопируйте код выше и отправьте его сотруднику в Telegram
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Если Telegram не открылся автоматически, используйте кнопку "Копировать" и отправьте код вручную.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
        >
          Закрыть
        </Button>
        <Button
          onClick={handleResendInvite}
          variant="contained"
          disabled={loading || !employee?.invite_code}
          startIcon={loading ? <CircularProgress size={16} /> : <Telegram />}
        >
          {loading ? 'Открытие Telegram...' : 'Открыть Telegram'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResendInviteModal; 