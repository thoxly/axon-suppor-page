import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Skeleton,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const PageSkeleton = ({ 
  title = "Загрузка...",
  showAddButton = true,
  children 
}) => {
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width={200} height={32} />
        {showAddButton && (
          <Skeleton variant="rounded" width={120} height={36} />
        )}
      </Box>
      
      <Paper sx={{ p: 3 }}>
        {children}
      </Paper>
    </Box>
  );
};

export default PageSkeleton; 