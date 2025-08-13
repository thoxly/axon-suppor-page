import React, { useState } from 'react';
import {
  Drawer,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useAuth from '../../hooks/useAuth';
import { api } from '../../utils/api';

const CompanyFormOffcanvas = ({ open, onClose, onSuccess }) => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    inn: '',
    address: '',
    work_start_time: '09:00',
    work_end_time: '18:00',
    lunch_break_start: '13:00',
    lunch_break_end: '14:00',
    comment: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.company.create(formData);
      await updateUser({ ...user, onboarding_completed: true, company_id: response.id });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating company:', error);
      // Handle error (show toast or alert)
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Создание компании</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Название компании"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <TextField
              fullWidth
              label="ИНН"
              name="inn"
              value={formData.inn}
              onChange={handleChange}
              required
              inputProps={{
                pattern: "[0-9]{10,12}"
              }}
              helperText="Введите 10-12 цифр"
            />

            <TextField
              fullWidth
              label="Адрес"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              multiline
              rows={2}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Рабочее время</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  type="time"
                  label="Начало"
                  name="work_start_time"
                  value={formData.work_start_time}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="time"
                  label="Конец"
                  name="work_end_time"
                  value={formData.work_end_time}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Обеденный перерыв</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  type="time"
                  label="Начало"
                  name="lunch_break_start"
                  value={formData.lunch_break_start}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="time"
                  label="Конец"
                  name="lunch_break_end"
                  value={formData.lunch_break_end}
                  onChange={handleChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>

            <TextField
              fullWidth
              label="Комментарий"
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              multiline
              rows={3}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
            >
              Создать компанию
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
};

export default CompanyFormOffcanvas; 