import React, { Suspense } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { Person } from '@mui/icons-material';

// Ленивая загрузка Avatar
const LazyAvatar = React.lazy(() => Promise.resolve({ default: Avatar }));

// Компонент для отображения загрузки
const TableLoader = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    py={4}
  >
    <CircularProgress size={24} />
  </Box>
);

const EmployeesTable = ({ employees, actionButtons }) => {
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Приглашен';
      case 'active':
        return 'Активный';
      case 'inactive':
        return 'Неактивный';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <TableContainer sx={{ width: '100%' }}>
      <Table sx={{ width: '100%' }} aria-label="employees table">
        <TableHead>
          <TableRow>
            <TableCell>Имя</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Ник телеграм</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell align="right">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((employee) => (
            <TableRow
              key={employee.id}
              sx={{
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': { backgroundColor: 'background.subtle' },
              }}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Suspense fallback={<TableLoader />}>
                    <LazyAvatar
                      src={employee.photo_url}
                      sx={{ width: 32, height: 32 }}
                    >
                      <Person />
                    </LazyAvatar>
                  </Suspense>
                  <Box>
                    <Box sx={{ fontWeight: 500 }}>
                      {employee.full_name || 'Не указано'}
                    </Box>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{employee.email || 'Не указан'}</TableCell>
              <TableCell>
                {employee.username ? `@${employee.username}` : 'Не указан'}
              </TableCell>
              <TableCell>
                <Chip
                  label={getStatusLabel(employee.status)}
                  size="small"
                  color={getStatusColor(employee.status)}
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  {actionButtons(employee)}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EmployeesTable; 