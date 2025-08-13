import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Container,
  Typography
} from '@mui/material';
import {
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { isTelegramWebApp } from '../../utils/telegram';
import { LOGO_URL, LOGO_DARK_MODE_URL } from '../../config/urls';

const HomeHeader = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const { toggleTheme, isDark } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: isDark ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar sx={{ px: { xs: 0 } }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src={isDark ? LOGO_DARK_MODE_URL : LOGO_URL} 
              alt="Logo" 
              style={{ 
                maxWidth: '180px', 
                height: 'auto',
                cursor: 'pointer'
              }} 
              onClick={() => navigate('/')}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
            {/* Кнопка переключения темы (скрыта в Telegram Web App) */}
            {!isTelegramWebApp() && (
              <IconButton
                size="large"
                aria-label="toggle theme"
                color="inherit"
                onClick={toggleTheme}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    color: 'text.primary'
                  }
                }}
              >
                {isDark ? <LightMode /> : <DarkMode />}
              </IconButton>
            )}

            {/* Навигационные кнопки */}
            {isAuthenticated ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/dashboard/tasks')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white'
                    }
                  }}
                >
                  {isMobile ? 'Дашборд' : 'Перейти в дашборд'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate('/login')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    color: 'text.secondary',
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      color: 'text.primary'
                    }
                  }}
                >
                  Войти
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/register')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    }
                  }}
                >
                  Регистрация
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default HomeHeader; 