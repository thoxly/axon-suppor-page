import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  alpha,
  useTheme,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

import { roleLabels } from './constants';

const SettingsView = ({ profile, onBack }) => {
  const theme = useTheme();

  return (
    <Box sx={{ pb: '88px' }}>
      {/* Back button */}
      <IconButton
        onClick={onBack}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1200,
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          '&:hover': {
            background: alpha(theme.palette.background.paper, 0.7),
          }
        }}
      >
        <ArrowBackIcon />
      </IconButton>

      <Container maxWidth="md">
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            mt: 4, 
            mb: 4,
            fontWeight: 800,
            textAlign: 'center',
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          Настройки
        </Typography>

        {profile ? (
          <Card sx={{ 
            borderRadius: '20px',
            boxShadow: `0 10px 40px -10px ${alpha(theme.palette.primary.main, 0.2)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar 
                  sx={{ 
                    mr: 2, 
                    width: 64, 
                    height: 64,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                >
                  <PersonIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {profile.first_name} {profile.last_name}
                  </Typography>
                  <Typography color="text.secondary" sx={{ opacity: 0.8 }}>
                    {profile.username ? `@${profile.username}` : 'Пользователь'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3, opacity: 0.1 }} />

              <List>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon sx={{ color: theme.palette.primary.main }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography sx={{ fontWeight: 600 }}>Email</Typography>}
                    secondary={profile.email || 'Не указан'} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon sx={{ color: theme.palette.secondary.main }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography sx={{ fontWeight: 600 }}>Роль</Typography>}
                    secondary={roleLabels[profile.role] || 'Не определена'} 
                  />
                </ListItem>
                
                {profile.company && (
                  <ListItem>
                    <ListItemIcon>
                      <BusinessIcon sx={{ color: theme.palette.primary.main }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={<Typography sx={{ fontWeight: 600 }}>Компания</Typography>}
                      secondary={profile.company.name} 
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        ) : (
          <Alert 
            severity="info" 
            sx={{ 
              borderRadius: '16px',
              background: alpha(theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              '& .MuiAlert-icon': {
                color: theme.palette.info.main
              }
            }}
          >
            Загрузка профиля...
          </Alert>
        )}
      </Container>
    </Box>
  );
};

export default SettingsView; 