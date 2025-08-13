import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  FormControl,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';

const validationSchema = yup.object({
  name: yup.string().required('Название обязательно'),
  address: yup.string().required('Адрес обязателен'),
  status: yup.boolean(),
});

const LocationFormOffcanvas = ({ show, onClose, onSubmit, initialData }) => {
  const formik = useFormik({
    initialValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      status: initialData?.status === 'active' || false,
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      onSubmit({
        ...values,
        id: initialData?.id || Date.now(),
        status: values.status ? 'active' : 'inactive',
      });
      formik.resetForm();
    },
    enableReinitialize: true,
  });

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
          width: { xs: '100%', sm: 480 },
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
            {initialData ? 'Редактировать локацию' : 'Новая локация'}
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
          }}
        >
          <TextField
            fullWidth
            id="name"
            name="name"
            label="Название"
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
          />

          <TextField
            fullWidth
            id="address"
            name="address"
            label="Адрес"
            multiline
            rows={3}
            value={formik.values.address}
            onChange={formik.handleChange}
            error={formik.touched.address && Boolean(formik.errors.address)}
            helperText={formik.touched.address && formik.errors.address}
          />

          <FormControl component="fieldset" variant="standard">
            <FormControlLabel
              control={
                <Switch
                  checked={formik.values.status}
                  onChange={formik.handleChange}
                  name="status"
                />
              }
              label="Активная локация"
            />
          </FormControl>

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

export default LocationFormOffcanvas;