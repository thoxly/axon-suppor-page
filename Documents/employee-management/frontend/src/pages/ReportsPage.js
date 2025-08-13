import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ReportsPage = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Отчеты
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Здесь будут отчеты и аналитика
        </Typography>
      </Paper>
    </Box>
  );
};

export default ReportsPage; 