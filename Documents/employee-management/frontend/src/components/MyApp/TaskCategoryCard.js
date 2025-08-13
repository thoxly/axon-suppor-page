import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Badge,
  alpha,
  useTheme,
} from '@mui/material';

const TaskCategoryCard = ({ title, count, onClick, isActive = false }) => {
  const theme = useTheme();

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Badge
        badgeContent={count}
        color="primary"
        sx={{
          width: '100%',
          height: '100%',
          '& .MuiBadge-badge': {
            fontSize: '0.75rem',
            height: '20px',
            minWidth: '20px',
            borderRadius: '10px',
            fontWeight: 600,
            right: 2,
            top: 2,
          }
        }}
      >
        <Paper
          onClick={onClick}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            borderRadius: 3,
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.2s ease-in-out',
            background: isActive 
              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
              : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
            border: isActive 
              ? `2px solid ${theme.palette.primary.main}`
              : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: isActive
              ? `0 4px 16px -4px ${alpha(theme.palette.primary.main, 0.2)}`
              : `0 4px 16px -4px ${alpha(theme.palette.common.black, 0.08)}`,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 24px -6px ${alpha(theme.palette.common.black, 0.12)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
            }
          }}
        >
          <Typography
            variant="subtitle2"
            component="h3"
            sx={{
              fontWeight: 600,
              textAlign: 'center',
              fontSize: '0.875rem',
              color: theme.palette.text.primary,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
        </Paper>
      </Badge>
    </Box>
  );
};

export default TaskCategoryCard; 