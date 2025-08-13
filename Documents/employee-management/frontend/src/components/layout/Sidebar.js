import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Assignment as TasksIcon,
  People as EmployeesIcon,
  LocationOn as LocationIcon,
  Timeline as TrackerIcon,
  Assessment as ReportsIcon,
} from '@mui/icons-material';
import { useAuthContext } from '../../context/AuthContext';

const getMenuItems = (isManager) => {
  const commonItems = [
    { text: 'Задачи', icon: <TasksIcon />, path: '/dashboard/tasks' },
  ];

  const managerItems = [
    { text: 'Сотрудники', icon: <EmployeesIcon />, path: '/dashboard/employees' },
    { text: 'Мои локации', icon: <LocationIcon />, path: '/dashboard/my-locations' },
    { text: 'Трекер', icon: <TrackerIcon />, path: '/dashboard/tracker' },
    { text: 'Отчеты', icon: <ReportsIcon />, path: '/dashboard/reports' },
  ];

  return isManager ? [...commonItems, ...managerItems] : commonItems;
};

const Sidebar = ({ variant = 'permanent', open = true, onClose, drawerWidth = 280 }) => {
  const location = useLocation();
  const { isManager } = useAuthContext();
  const menuItems = getMenuItems(isManager());

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        display: { xs: variant === 'permanent' ? 'none' : 'block', md: 'block' },
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.subtle',
          borderRight: 'none',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', px: 3, py: 2 }}>
        <List sx={{ '& .MuiListItem-root': { mb: 1 } }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    borderRadius: 1,
                    backgroundColor: isActive ? 'background.paper' : 'transparent',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: isActive ? 'background.paper' : 'background.default',
                    },
                    '& .MuiListItemIcon-root': {
                      color: isActive ? 'primary.main' : 'text.secondary',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.9375rem',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 