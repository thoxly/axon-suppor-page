import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Typography,
  alpha,
  useTheme,
  Grid,
  Paper,
  Slide,
  IconButton,
  Fade,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  Assignment as TasksIcon,
  CheckCircleOutline as CompletedIcon,
  Add as FreeIcon,
} from '@mui/icons-material';
import TelegramYandexMap from '../Map/TelegramYandexMap';
import { formatDate } from '../../utils/dateUtils';
import StatusBadge, { statusLabels } from '../common/StatusBadge';

const MapView = ({
  currentTask,
  showMap,
  targetLocation,
  currentLocation,
  route,
  onStartWork,
  onCompleteWork,
  viewportHeight,
  hasActiveLocationSession,
  // Новые пропсы для задач
  myTasks = [],
  freeTasks = [],
  completedTasks = [],
  onTaskCategoryClick,
  onTaskClick,
  selectedCategory: externalSelectedCategory = null,
  telegramId,
}) => {
  const theme = useTheme();
  const [internalSelectedCategory, setInternalSelectedCategory] = useState(null);
  const [showTaskInfo, setShowTaskInfo] = useState(false);
  
  // Используем внешнюю категорию, если она передана, иначе внутреннюю
  const selectedCategory = externalSelectedCategory || internalSelectedCategory;
  
  // Автоматически показываем задачи, когда внешняя категория изменяется
  useEffect(() => {
    if (externalSelectedCategory && externalSelectedCategory !== internalSelectedCategory) {
      setShowTaskInfo(true);
    }
  }, [externalSelectedCategory, internalSelectedCategory]);

  const handleCategoryClick = (category) => {
    // Если передана внешняя категория, используем её, иначе устанавливаем внутреннюю
    if (externalSelectedCategory !== null) {
      // Внешняя категория управляется родительским компонентом
      setShowTaskInfo(true);
      if (onTaskCategoryClick) {
        onTaskCategoryClick(category);
      }
    } else {
      // Внутренняя категория управляется этим компонентом
      setInternalSelectedCategory(category);
      setShowTaskInfo(true);
      if (onTaskCategoryClick) {
        onTaskCategoryClick(category);
      }
    }
  };

  const handleCloseTaskInfo = () => {
    setShowTaskInfo(false);
    setInternalSelectedCategory(null);
  };

  const getTasksForCategory = () => {
    switch (selectedCategory) {
      case 'my':
        return myTasks;
      case 'free':
        return freeTasks;
      case 'completed':
        return completedTasks;
      default:
        return [];
    }
  };

  const getCategoryTitle = () => {
    switch (selectedCategory) {
      case 'my':
        return 'Мои задачи';
      case 'free':
        return 'Свободные задачи';
      case 'completed':
        return 'Завершенные задачи';
      default:
        return '';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'my':
        return <TasksIcon />;
      case 'free':
        return <FreeIcon />;
      case 'completed':
        return <CompletedIcon />;
      default:
        return <TasksIcon />;
    }
  };

  return (
    <Box 
      sx={{ 
        height: viewportHeight,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Full-screen map */}
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        filter: hasActiveLocationSession ? 'none' : 'grayscale(100%) brightness(0.7)',
        transition: 'filter 0.3s ease-in-out',
      }}>
        <TelegramYandexMap 
          points={targetLocation ? [
            { 
              coordinates: targetLocation,
              description: currentTask?.company_address || currentTask?.company?.name
            }
          ] : []}
          center={currentLocation}
          route={route}
          zoom={15}
          height="100%"
          showActiveLocation={hasActiveLocationSession}
        />
      </Box>

      {/* Top overlay with title and current task info */}
      <Fade in timeout={800}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: 2,
          }}
        >
          {/* Полупрозрачная панель с размытием */}
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              p: 2,
              mb: 2,
            }}
          >
            <Typography 
              variant="h5" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              {currentTask ? 'Текущая задача' : 
               hasActiveLocationSession ? '' : 'Геопозиция неизвестна'}
            </Typography>

            {/* Индикатор статуса локации для случая без текущей задачи */}
            {!currentTask && (
              <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: hasActiveLocationSession ? 
                      theme.palette.success.main : theme.palette.warning.main,
                    mr: 1,
                    animation: hasActiveLocationSession ? 
                      'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': {
                        boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.7)}`,
                      },
                      '70%': {
                        boxShadow: `0 0 0 10px ${alpha(theme.palette.success.main, 0)}`,
                      },
                      '100%': {
                        boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0)}`,
                      },
                    },
                  }}
                />
                <Typography variant="caption" sx={{ 
                  color: hasActiveLocationSession ? 
                    theme.palette.success.main : theme.palette.warning.main,
                  fontWeight: 500 
                }}>
                  {hasActiveLocationSession ? 
                    '📍 Геолокация активна' : '⚠️ Ожидание локации'}
                </Typography>
              </Box>
            )}

            {currentTask && (
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    {currentTask.title}
                  </Typography>
                  <StatusBadge status={currentTask.status} />
                </Box>
                
                <Box display="flex" alignItems="center" mb={1}>
                  <LocationIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                    {currentTask.company_address || currentTask.company?.name || 'Адрес не указан'}
                  </Typography>
                </Box>

                {/* Индикатор статуса локации */}
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: currentLocation && currentLocation.length === 2 ? 
                        theme.palette.success.main : theme.palette.warning.main,
                      mr: 1,
                      animation: currentLocation && currentLocation.length === 2 ? 
                        'pulse 2s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': {
                          boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.7)}`,
                        },
                        '70%': {
                          boxShadow: `0 0 0 10px ${alpha(theme.palette.success.main, 0)}`,
                        },
                        '100%': {
                          boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0)}`,
                        },
                      },
                    }}
                  />
                  <Typography variant="caption" sx={{ 
                    color: currentLocation && currentLocation.length === 2 ? 
                      theme.palette.success.main : theme.palette.warning.main,
                    fontWeight: 500 
                  }}>
                    {currentLocation && currentLocation.length === 2 ? 
                      '📍 Геолокация активна' : '⚠️ Ожидание локации'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </Fade>

      {/* Task category buttons on the map */}
      <Fade in timeout={1000}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: 16,
            transform: 'translateY(-50%)',
            zIndex: 1000,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Мои задачи */}
            <Paper
              elevation={0}
              sx={{
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                p: 0,
              }}
            >
              <Button
                variant="text"
                startIcon={getCategoryIcon('my')}
                onClick={() => handleCategoryClick('my')}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2,
                  py: 1.5,
                  color: theme.palette.text.primary,
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.1),
                    transform: 'translateX(4px)',
                  },
                  transition: 'all 0.3s ease-in-out',
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                Мои задачи
                {myTasks.length > 0 && (
                  <Chip
                    label={myTasks.length}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: alpha(theme.palette.primary.main, 0.2),
                      color: theme.palette.primary.main,
                    }}
                  />
                )}
              </Button>
            </Paper>

            {/* Свободные задачи */}
            <Paper
              elevation={0}
              sx={{
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                p: 0,
              }}
            >
              <Button
                variant="text"
                startIcon={getCategoryIcon('free')}
                onClick={() => handleCategoryClick('free')}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2,
                  py: 1.5,
                  color: theme.palette.text.primary,
                  '&:hover': {
                    background: alpha(theme.palette.secondary.main, 0.1),
                    transform: 'translateX(4px)',
                  },
                  transition: 'all 0.3s ease-in-out',
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                Свободные
                {freeTasks.length > 0 && (
                  <Chip
                    label={freeTasks.length}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: alpha(theme.palette.secondary.main, 0.2),
                      color: theme.palette.secondary.main,
                    }}
                  />
                )}
              </Button>
            </Paper>

            {/* Завершенные задачи */}
            <Paper
              elevation={0}
              sx={{
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                p: 0,
              }}
            >
              <Button
                variant="text"
                startIcon={getCategoryIcon('completed')}
                onClick={() => handleCategoryClick('completed')}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2,
                  py: 1.5,
                  color: theme.palette.text.primary,
                  '&:hover': {
                    background: alpha(theme.palette.success.main, 0.1),
                    transform: 'translateX(4px)',
                  },
                  transition: 'all 0.3s ease-in-out',
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                Завершенные
                {completedTasks.length > 0 && (
                  <Chip
                    label={completedTasks.length}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: alpha(theme.palette.success.main, 0.2),
                      color: theme.palette.success.main,
                    }}
                  />
                )}
              </Button>
            </Paper>
          </Box>
        </Box>
      </Fade>

      {/* Sliding task info panel */}
      <Slide direction="up" in={showTaskInfo} timeout={400}>
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40vh',
            background: `linear-gradient(to top, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
            backdropFilter: 'blur(20px)',
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            p: 3,
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Drag indicator */}
          <Box
            sx={{
              width: 40,
              height: 4,
              backgroundColor: alpha(theme.palette.divider, 0.3),
              borderRadius: 2,
              mx: 'auto',
              mb: 2,
            }}
          />

          {/* Header with close button */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                color: theme.palette.text.primary,
              }}
            >
              {getCategoryTitle()}
            </Typography>
            <IconButton
              onClick={handleCloseTaskInfo}
              sx={{
                background: alpha(theme.palette.divider, 0.1),
                '&:hover': {
                  background: alpha(theme.palette.divider, 0.2),
                }
              }}
            >
              ✕
            </IconButton>
          </Box>

          {/* Tasks list */}
          <Box sx={{ maxHeight: 'calc(40vh - 120px)', overflowY: 'auto' }}>
            {getTasksForCategory().length === 0 ? (
              <Typography 
                variant="body2" 
                sx={{ 
                  textAlign: 'center',
                  color: theme.palette.text.secondary,
                  py: 4
                }}
              >
                {selectedCategory === 'my' && 'У вас нет назначенных задач'}
                {selectedCategory === 'free' && 'Нет доступных свободных задач'}
                {selectedCategory === 'completed' && 'Нет завершенных задач'}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {getTasksForCategory().map((task) => (
                  <Paper
                    key={task.id}
                    onClick={() => onTaskClick && onTaskClick(task)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        background: alpha(theme.palette.primary.main, 0.05),
                        transform: 'translateY(-1px)',
                        boxShadow: `0 4px 12px -2px ${alpha(theme.palette.common.black, 0.1)}`,
                      }
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {task.title}
                      </Typography>
                      <StatusBadge status={task.status} />
                    </Box>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {task.company_address || task.company?.name || 'Адрес не указан'}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </Paper>
      </Slide>

      {/* Bottom controls for current task */}
      <Box
        sx={{
          position: 'absolute',
          bottom: showTaskInfo ? '40vh' : 0,
          left: 0,
          right: 0,
          padding: 2,
          transition: 'bottom 0.4s ease-in-out',
        }}
      >
        {/* Полупрозрачная панель с размытием */}
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            p: 2,
          }}
        >
          {currentTask?.status === 'accepted' && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={(e) => onStartWork(currentTask.id, e)}
              fullWidth
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                }
              }}
            >
              Начать работу
            </Button>
          )}

          {(currentTask?.status === 'in-progress' || currentTask?.status === 'accepted') && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={(e) => onCompleteWork(currentTask.id, e)}
              fullWidth
              sx={{ 
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                py: 2,
                fontSize: '1.1rem',
                background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px -5px ${alpha(theme.palette.success.main, 0.4)}`,
                },
                transition: 'all 0.3s ease-in-out',
                boxShadow: `0 4px 15px -3px ${alpha(theme.palette.success.main, 0.3)}`,
              }}
            >
              Завершить задачу
            </Button>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default MapView; 