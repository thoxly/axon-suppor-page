import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Skeleton,
} from '@mui/material';

const TableSkeleton = ({ 
  rows = 5, 
  columns = 5, 
  showHeader = true,
  avatarInFirstColumn = false,
  chipInColumn = null 
}) => {
  const renderCell = (columnIndex) => {
    if (avatarInFirstColumn && columnIndex === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={120} height={20} />
        </Box>
      );
    }
    
    if (chipInColumn === columnIndex) {
      return <Skeleton variant="rounded" width={80} height={24} />;
    }
    
    return <Skeleton variant="text" width="100%" height={20} />;
  };

  return (
    <TableContainer>
      <Table>
        {showHeader && (
          <TableHead>
            <TableRow>
              {Array.from({ length: columns }).map((_, index) => (
                <TableCell key={index}>
                  <Skeleton variant="text" width="60%" height={24} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  {renderCell(colIndex)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TableSkeleton; 