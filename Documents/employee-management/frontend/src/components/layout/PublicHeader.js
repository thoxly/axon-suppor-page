import React from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Container,
  IconButton,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  LightMode,
  DarkMode
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext';
import { LOGO_URL, LOGO_DARK_MODE_URL } from '../../config/urls';

const PublicHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDark } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { label: 'Главная', path: '/' },
    { label: 'Возможности', path: '/#features' },
    { label: 'О системе', path: '/#about' }
  ];

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Box sx={{ p: 2 }}>
        <img 
          src={isDark ? LOGO_DARK_MODE_URL : LOGO_URL} 
          alt="Logo" 
          style={{ 
            maxWidth: '150px', 
            height: 'auto',
            cursor: 'pointer'
          }} 
          onClick={() => handleNavigation('/')}
        />
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem 
            key={item.label} 
            onClick={() => handleNavigation(item.path)}
            sx={{
              cursor: 'pointer',
              bgcolor: isActive(item.path) ? 'action.selected' : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ListItemText 
              primary={item.label}
              sx={{
                color: isActive(item.path) ? 'primary.main' : 'text.primary',
                fontWeight: isActive(item.path) ? 600 : 400
              }}
            />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={() => handleNavigation('/login')}
          sx={{ mb: 1 }}
        >
          Войти
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={() => handleNavigation('/register')}
        >
          Регистрация
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
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
                onClick={() => handleNavigation('/')}
              />
            </Box>

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.label}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      color: isActive(item.path) ? 'primary.main' : 'text.primary',
                      fontWeight: isActive(item.path) ? 600 : 400,
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              {/* Theme Toggle */}
              <IconButton
                size="large"
                aria-label="toggle theme"
                color="inherit"
                onClick={toggleTheme}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { 
                    backgroundColor: 'background.subtle',
                    color: 'text.primary'
                  }
                }}
              >
                {isDark ? <LightMode /> : <DarkMode />}
              </IconButton>

              {/* Desktop Auth Buttons */}
              {!isMobile && (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => handleNavigation('/login')}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Войти
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleNavigation('/register')}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Регистрация
                  </Button>
                </>
              )}

              {/* Mobile Menu Button */}
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{
                    color: 'text.primary',
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            bgcolor: 'background.paper'
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Toolbar spacer */}
      <Toolbar />
    </>
  );
};

export default PublicHeader; 