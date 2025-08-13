import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const DeleteConfirmModal = ({ show, onClose, onConfirm, location }) => {
  if (!location) return null;

  return (
    <Dialog
      open={show}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
        }}
      >
        <Typography variant="h6">Удаление локации</Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, pb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            backgroundColor: 'error.lighter',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <WarningIcon sx={{ color: 'error.main' }} />
          <Typography variant="body2" color="error.main">
            Это действие нельзя будет отменить
          </Typography>
        </Box>

        <Typography variant="body1" gutterBottom>
          Вы уверены, что хотите удалить локацию "{location.name}"?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Все данные, связанные с этой локацией, будут удалены.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderColor: 'divider' }}
        >
          Отмена
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          autoFocus
        >
          Удалить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmModal; 