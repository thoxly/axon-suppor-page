import React, { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Container,
  Snackbar,
  alpha,
  useTheme,
  IconButton,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import ViewTransition from '../../components/ViewTransition';
import TasksListPage from './TasksListPage';
import SettingsView from '../../components/MyApp/SettingsView';
import LocationInstructionModal from '../../components/LocationInstructionModal';
import { useAuthContext } from '../../context/AuthContext';
import { useMyAppSimple } from '../../hooks/useMyAppSimple';

const MyAppContainer = () => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuthContext();
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      setViewportHeight(tg.viewportHeight || window.innerHeight);
    }

    const handleResize = () => {
      if (window.Telegram?.WebApp) {
        setViewportHeight(window.Telegram.WebApp.viewportHeight || window.innerHeight);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    currentView,
    profile,
    loading,
    error,
    snackbar,
    locationModalOpen,
    
    handleNavChange,
    handleCloseSnackbar,
    handleLocationModalClose,
    handleLocationModalRetry,
  } = useMyAppSimple(isAuthenticated, user);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Box 
      sx={{ 
        height: `${viewportHeight}px`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Settings button */}
      <IconButton
        onClick={() => handleNavChange(null, 'settings')}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1200,
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          '&:hover': {
            background: alpha(theme.palette.background.paper, 0.7),
          }
        }}
      >
        <SettingsIcon />
      </IconButton>

      <ViewTransition active={currentView === 'home'} direction="slide">
        <TasksListPage />
      </ViewTransition>

      <ViewTransition active={currentView === 'settings'} direction="slide">
        <SettingsView 
          profile={profile} 
          onBack={() => handleNavChange(null, 'home')}
        />
      </ViewTransition>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 2 }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ 
            width: '100%',
            borderRadius: '12px',
            fontWeight: 500,
            boxShadow: `0 8px 32px -4px ${alpha(theme.palette.common.black, 0.1)}`,
            border: `1px solid ${alpha(theme.palette[snackbar.severity].main, 0.2)}`
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <LocationInstructionModal
        open={locationModalOpen}
        onClose={handleLocationModalClose}
        onRetry={handleLocationModalRetry}
      />
    </Box>
  );
};

export default MyAppContainer; 