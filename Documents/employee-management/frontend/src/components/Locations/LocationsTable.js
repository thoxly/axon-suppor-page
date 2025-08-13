import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';

const LocationsTable = ({ locations, actionButtons }) => {
  return (
    <TableContainer sx={{ width: '100%' }}>
      <Table sx={{ width: '100%' }} aria-label="locations table">
        <TableHead>
          <TableRow>
            <TableCell>Название</TableCell>
            <TableCell>Адрес</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell>Сотрудники</TableCell>
            <TableCell align="right">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {locations.map((location) => (
            <TableRow
              key={location.id}
              sx={{
                '&:last-child td, &:last-child th': { border: 0 },
                '&:hover': { backgroundColor: 'background.subtle' },
              }}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn
                    sx={{
                      color: 'primary.main',
                      fontSize: 20,
                    }}
                  />
                  {location.name}
                </Box>
              </TableCell>
              <TableCell>{location.address}</TableCell>
              <TableCell>
                <Chip
                  label={location.status === 'active' ? 'Активна' : 'Неактивна'}
                  size="small"
                  color={location.status === 'active' ? 'success' : 'default'}
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              </TableCell>
              <TableCell>
                {location.employeeCount || 0} сотрудников
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  {actionButtons(location)}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LocationsTable;