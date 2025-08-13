import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Skeleton,
  Chip,
} from '@mui/material';

const CardSkeleton = ({ 
  showMap = false,
  showActions = true,
  showExpanded = false 
}) => {
  return (
    <Card sx={{ mb: 2, overflow: 'visible' }}>
      <CardContent>
        {/* Заголовок и статус */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={16} />
          </Box>
          <Skeleton variant="rounded" width={80} height={24} />
        </Box>

        {/* Информация о задаче */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
            <Skeleton variant="text" width="70%" height={16} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
            <Skeleton variant="text" width="50%" height={16} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
            <Skeleton variant="text" width="40%" height={16} />
          </Box>
        </Box>

        {/* Расширенная информация */}
        {showExpanded && (
          <Box sx={{ mb: 2 }}>
            <Skeleton variant="text" width="100%" height={16} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="90%" height={16} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="75%" height={16} />
          </Box>
        )}

        {/* Карта */}
        {showMap && (
          <Box sx={{ mb: 2 }}>
            <Skeleton variant="rounded" width="100%" height={200} />
          </Box>
        )}

        {/* Кнопки действий */}
        {showActions && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Skeleton variant="rounded" width={100} height={36} />
            <Skeleton variant="rounded" width={100} height={36} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CardSkeleton; 