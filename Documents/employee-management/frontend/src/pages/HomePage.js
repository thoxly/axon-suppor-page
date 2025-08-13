import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Business,
  People,
  LocationOn,
  Assignment,
  Analytics,
  Telegram,
  Security,
  Speed,
  Support,
  CheckCircle,
  AccessTime,
  PhotoCamera
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import HomeHeader from '../components/layout/HomeHeader';

const FeatureCard = ({ icon: Icon, title, description, color = 'primary' }) => (
  <Card 
    elevation={0}
    sx={{ 
      height: '100%',
      border: '1px solid',
      borderColor: 'divider',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
        borderColor: `${color}.main`
      }
    }}
  >
    <CardContent sx={{ textAlign: 'center', p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Icon 
          sx={{ 
            fontSize: 48, 
            color: `${color}.main`,
            mb: 1
          }} 
        />
      </Box>
      <Typography variant="h6" gutterBottom fontWeight="600">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
  </Card>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Убираем автоматическое перенаправление - пользователь может остаться на главной странице

  const features = [
    {
      icon: Assignment,
      title: 'Назначение и контроль задач',
      description: 'Создавайте задачи за секунды, назначайте исполнителей и контролируйте статус выполнения в реальном времени',
      color: 'primary'
    },
    {
      icon: PhotoCamera,
      title: 'Подтверждение работ',
      description: 'Фотоотчеты, комментарии и геометка — прозрачное подтверждение факта выполнения работ',
      color: 'secondary'
    },
    {
      icon: AccessTime,
      title: 'Учет времени в задачах',
      description: 'Автоматический расчет времени на задачу и истории смен — без ручного ввода',
      color: 'success'
    },
    {
      icon: LocationOn,
      title: 'Геоконтроль',
      description: 'Фиксируем местоположение сотрудников и адрес выполнения работ для наглядного контроля',
      color: 'info'
    },
    {
      icon: Analytics,
      title: 'Аналитика и отчеты',
      description: 'Готовые отчеты по задачам, загрузке сотрудников и SLA — данные для управленческих решений',
      color: 'warning'
    },
    {
      icon: Telegram,
      title: 'Работа через Telegram',
      description: 'Сотрудникам не нужно устанавливать приложение — все действия в удобном Telegram-боте',
      color: 'info'
    }
  ];

  const benefits = [
    { icon: Speed, text: 'Запуск за 10 минут' },
    { icon: Telegram, text: 'Работает через Telegram' },
    { icon: Security, text: 'Безопасность данных' },
    { icon: Support, text: 'Техническая поддержка' }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <HomeHeader />
      
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          pt: { xs: 10, md: 14 }, // Add top padding to account for fixed header
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h2" 
                component="h1" 
                gutterBottom
                sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '2.2rem', md: '3.1rem' }
                }}
              >
                Контроль полевых сотрудников и задач в одном месте
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 4, 
                  opacity: 0.9,
                  fontWeight: 300
                }}
              >
                Назначайте задачи, подтверждайте выполнение фото и геометкой, следите за статусами онлайн. Telegram-бот для сотрудников — без установки приложений.
              </Typography>
              
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2}
                sx={{ mb: 4 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'grey.100'
                    }
                  }}
                >
                  Попробовать бесплатно
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Войти
                </Button>
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {benefits.map((benefit, index) => (
                  <Chip
                    key={index}
                    icon={<benefit.icon />}
                    label={benefit.text}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                ))}
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  bgcolor: 'rgba(255,255,255,0.08)',
                  border: '1px solid',
                  borderColor: 'rgba(255,255,255,0.25)',
                  borderRadius: 3
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'white' }}>
                  Как это работает
                </Typography>
                <List>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'white' }}>
                      <CheckCircle />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ color: 'white' }}
                      secondaryTypographyProps={{ color: 'rgba(255,255,255,0.8)' }}
                      primary="Руководитель создаёт задачу и выбирает исполнителя"
                      secondary="Пара кликов в веб-интерфейсе"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'white' }}>
                      <Telegram />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ color: 'white' }}
                      secondaryTypographyProps={{ color: 'rgba(255,255,255,0.8)' }}
                      primary="Сотрудник получает уведомление в Telegram"
                      secondary="Без установки приложений — сразу готово к работе"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'white' }}>
                      <PhotoCamera />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ color: 'white' }}
                      secondaryTypographyProps={{ color: 'rgba(255,255,255,0.8)' }}
                      primary="Исполнитель делает фото и завершает задачу на месте"
                      secondary="Фиксируется адрес и время выполнения"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'white' }}>
                      <Analytics />
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ color: 'white' }}
                      secondaryTypographyProps={{ color: 'rgba(255,255,255,0.8)' }}
                      primary="Вы видите статус и доказательства выполнения в реальном времени"
                      secondary="Фото, геометка, время — всё в одном месте"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography 
            variant="h3" 
            component="h2" 
            gutterBottom
            sx={{ fontWeight: 600 }}
          >
            Возможности системы
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{ maxWidth: 720, mx: 'auto' }}
          >
            Управляйте выездными процессами без хаоса в мессенджерах и таблицах. Единая платформа — от назначения задач до отчётов по выполнению.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <FeatureCard {...feature} />
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          py: { xs: 6, md: 8 },
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3
            }}
          >
            <Typography 
              variant="h4" 
              component="h3" 
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Готовы навести порядок в выездных задачах?
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Подключите команду за 10 минут и начните получать подтверждённые результаты уже сегодня.
            </Typography>
            
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2}
              justifyContent="center"
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}
              >
                Создать аккаунт
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}
              >
                Войти
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage; 