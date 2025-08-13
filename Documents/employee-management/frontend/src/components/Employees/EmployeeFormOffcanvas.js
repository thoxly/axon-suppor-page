import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
import { Close as CloseIcon, Person as PersonIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';

const validationSchema = yup.object({
  full_name: yup.string().required('Имя обязательно'),
  username: yup.string(),
  email: yup.string().email('Некорректный email'),
  status: yup.string().required('Статус обязателен'),
  manager_id: yup.number().nullable(),
});

const EmployeeFormOffcanvas = ({ show, onClose, onSubmit, initialData, managers = [] }) => {
  const formik = useFormik({
    initialValues: {
      full_name: initialData?.full_name || '',
      username: initialData?.username || '',
      email: initialData?.email || '',
      status: initialData?.status || 'pending',
      manager_id: initialData?.manager_id || null,
      photo_url: initialData?.photo_url || '',
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      onSubmit({
        ...values,
        id: initialData?.id || Date.now(),
        invite_code: initialData?.invite_code || generateInviteCode(),
        created_at: initialData?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      formik.resetForm();
    },
    enableReinitialize: true,
  });

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  return (
    <Drawer
      anchor="right"
      open={show}
      onClose={() => {
        onClose();
        formik.resetForm();
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 520 },
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6">
            {initialData ? 'Редактировать сотрудника' : 'Новый сотрудник'}
          </Typography>
          <IconButton
            onClick={() => {
              onClose();
              formik.resetForm();
            }}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          component="form"
          onSubmit={formik.handleSubmit}
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            flexGrow: 1,
            overflow: 'auto',
          }}
        >
          {/* Аватар */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={formik.values.photo_url}
              sx={{ width: 80, height: 80 }}
            >
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <TextField
              fullWidth
              id="photo_url"
              name="photo_url"
              label="URL аватара"
              value={formik.values.photo_url}
              onChange={formik.handleChange}
              size="small"
            />
          </Box>

          <Divider />

          {/* Основная информация */}
          <TextField
            fullWidth
            id="full_name"
            name="full_name"
            label="Имя"
            value={formik.values.full_name}
            onChange={formik.handleChange}
            error={formik.touched.full_name && Boolean(formik.errors.full_name)}
            helperText={formik.touched.full_name && formik.errors.full_name}
          />

          <TextField
            fullWidth
            id="username"
            name="username"
            label="Ник телеграм"
            value={formik.values.username}
            onChange={formik.handleChange}
            error={formik.touched.username && Boolean(formik.errors.username)}
            helperText={formik.touched.username && formik.errors.username}
            placeholder="username"
          />

          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />

          <FormControl fullWidth>
            <InputLabel id="status-label">Статус</InputLabel>
            <Select
              labelId="status-label"
              id="status"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              label="Статус"
            >
              <MenuItem value="pending">Приглашен</MenuItem>
              <MenuItem value="active">Активный</MenuItem>
              <MenuItem value="inactive">Неактивный</MenuItem>
            </Select>
          </FormControl>

          {/* Инвайт код (только для pending) */}
          {formik.values.status === 'pending' && initialData?.invite_code && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Инвайт код
              </Typography>
              <Chip
                label={initialData.invite_code}
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
            </Box>
          )}

          <FormControl fullWidth>
            <InputLabel id="manager-label">Руководитель</InputLabel>
            <Select
              labelId="manager-label"
              id="manager_id"
              name="manager_id"
              value={formik.values.manager_id || ''}
              onChange={formik.handleChange}
              label="Руководитель"
            >
              <MenuItem value="">
                <em>Нет руководителя</em>
              </MenuItem>
              {managers.map((manager) => (
                <MenuItem key={manager.id} value={manager.id}>
                  {manager.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Дата создания (только при редактировании) */}
          {initialData?.created_at && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Создан
              </Typography>
              <Typography variant="body1">
                {new Date(initialData.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  onClose();
                  formik.resetForm();
                }}
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                type="submit"
                disabled={!formik.isValid || !formik.dirty}
              >
                {initialData ? 'Сохранить' : 'Создать'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default EmployeeFormOffcanvas; 