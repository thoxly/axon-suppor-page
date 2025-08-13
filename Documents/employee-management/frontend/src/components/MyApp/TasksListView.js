import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
  alpha,
  useTheme,
  Grid,
  Card,
  CardContent,
  Fade,
  Slide,
  Paper,
} from '@mui/material';
import TaskCard from './TaskCard';
import TaskCategoryCard from './TaskCategoryCard';
import TelegramYandexMap from '../Map/TelegramYandexMap';

const TasksListView = ({
  tasks,
  expandedTasks,
  onTaskExpand,
  onAcceptAssigned,
  onTakeFree,
  onStartWork,
  onCompleteWork,
  hasTaskInProgress,
  inProgressTask,
  showMap,
  targetLocation,
  currentLocation,
  route,
  viewportHeight,
  telegramId,
}) => {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('my'); // Set default to 'my'

  // Разделяем задачи по категориям
  const currentTask = tasks.assigned.find(task => task.status === 'in-progress');
  const myTasks = tasks.assigned.filter(task => task.status === 'assigned' || task.status === 'accepted');
  const freeTasks = tasks.free;
  const completedTasks = tasks.assigned.filter(task => task.status === 'completed');

  const renderTaskList = (tasksList, isAssigned = true) => (
    <Box>
      {tasksList.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          isAssigned={isAssigned}
          isExpanded={expandedTasks.has(task.id)}
          onExpand={onTaskExpand}
          onAcceptAssigned={onAcceptAssigned}
          onTakeFree={onTakeFree}
          onStartWork={onStartWork}
          onCompleteWork={onCompleteWork}
          hasTaskInProgress={hasTaskInProgress}
          inProgressTask={inProgressTask}
          showMap={showMap}
          targetLocation={targetLocation}
          currentLocation={currentLocation}
          route={route}
          telegramId={telegramId}
        />
      ))}
    </Box>
  );

  const renderCategoryCards = () => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={4}>
        <Box sx={{ height: '60px' }}>
          <TaskCategoryCard
            title="Мои задачи"
            count={myTasks.length}
            onClick={() => setSelectedCategory('my')}
          />
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box sx={{ height: '60px' }}>
          <TaskCategoryCard
            title="Свободные задачи"
            count={freeTasks.length}
            onClick={() => setSelectedCategory('free')}
          />
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box sx={{ height: '60px' }}>
          <TaskCategoryCard
            title="Завершенные"
            count={completedTasks.length}
            onClick={() => setSelectedCategory('completed')}
          />
        </Box>
      </Grid>
    </Grid>
  );

  const renderSelectedCategory = () => {
    if (!selectedCategory) return null;

    let title, tasks, emptyMessage, isAssigned;

    switch (selectedCategory) {
      case 'free':
        title = 'Свободные задачи';
        tasks = freeTasks;
        emptyMessage = 'Нет доступных свободных задач';
        isAssigned = false;
        break;
      case 'my':
        title = 'Мои задачи';
        tasks = myTasks;
        emptyMessage = 'У вас нет назначенных задач';
        isAssigned = true;
        break;
      case 'completed':
        title = 'Завершенные задачи';
        tasks = completedTasks;
        emptyMessage = 'Нет завершенных задач';
        isAssigned = true;
        break;
      default:
        return null;
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ 
            mb: 2,
            color: theme.palette.text.primary,
            fontWeight: 700,
            textAlign: 'center',
            fontSize: '1.1rem',
            letterSpacing: '-0.01em',
            position: 'relative',
            opacity: 0.9,
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 30,
              height: 2,
              borderRadius: '1px',
              background: `linear-gradient(90deg, ${alpha(theme.palette.secondary.main, 0.5)} 0%, ${alpha(theme.palette.primary.main, 0.5)} 100%)`,
            }
          }}
        >
          {title}
        </Typography>
        
        {tasks.length === 0 ? (
          <Alert 
            severity="info" 
            sx={{ 
              borderRadius: '12px',
              background: alpha(theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              '& .MuiAlert-icon': {
                color: theme.palette.info.main
              }
            }}
          >
            {emptyMessage}
          </Alert>
        ) : (
          <Box sx={{ maxHeight: '150px', overflowY: 'auto' }}>
            {renderTaskList(tasks, isAssigned)}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height: `${viewportHeight}px`, position: 'relative', overflow: 'hidden' }}>
      {/* Карта или текущая задача */}
      <Box sx={{ height: '100%', position: 'relative' }}>
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ 
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            color: theme.palette.primary.main,
            fontWeight: 700,
            textAlign: 'center',
            fontSize: '1.1rem',
            letterSpacing: '-0.01em',
            background: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
            px: 3,
            py: 1,
            borderRadius: '20px',
            boxShadow: `0 4px 20px -5px ${alpha(theme.palette.common.black, 0.1)}`,
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 30,
              height: 2,
              borderRadius: '1px',
              background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.7)} 0%, ${alpha(theme.palette.secondary.main, 0.7)} 100%)`,
            }
          }}
        >
          {currentTask ? 'Текущая задача' : 'Ваше положение'}
        </Typography>

        {!currentTask ? (
          <Fade in={true} timeout={500}>
            <Box sx={{ height: '100%', position: 'relative' }}>
              {!currentLocation && (
                <Alert 
                  severity="info" 
                  sx={{ 
                    position: 'absolute',
                    top: 80,
                    left: 16,
                    right: 16,
                    zIndex: 10,
                    borderRadius: '16px',
                    background: alpha(theme.palette.info.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    '& .MuiAlert-icon': {
                      color: theme.palette.info.main
                    }
                  }}
                >
                  Вы не делитесь координатами
                </Alert>
              )}
              <TelegramYandexMap 
                points={[]}
                center={currentLocation}
                zoom={15}
                height="100%"
              />
            </Box>
          </Fade>
        ) : (
          <TaskCard
            key={currentTask.id}
            task={currentTask}
            isAssigned={true}
            isExpanded={expandedTasks.has(currentTask.id)}
            onExpand={onTaskExpand}
            onAcceptAssigned={onAcceptAssigned}
            onTakeFree={onTakeFree}
            onStartWork={onStartWork}
            onCompleteWork={onCompleteWork}
            hasTaskInProgress={hasTaskInProgress}
            inProgressTask={inProgressTask}
            showMap={showMap}
            targetLocation={targetLocation}
            currentLocation={currentLocation}
            route={route}
            telegramId={telegramId}
          />
        )}
      </Box>

      {/* Выдвигающаяся панель с категориями задач */}
      <Slide direction="up" in={!currentTask} timeout={600}>
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '30vh',
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
          {/* Индикатор для перетаскивания */}
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
          
          {renderCategoryCards()}
          {renderSelectedCategory()}
        </Paper>
      </Slide>
    </Box>
  );
};

export default TasksListView; 