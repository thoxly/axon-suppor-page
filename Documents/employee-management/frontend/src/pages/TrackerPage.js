import React, { useState } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import PeriodTracker from '../components/Tracker/PeriodTracker';
import TaskTracker from '../components/Tracker/TaskTracker';
import OnlineTracker from '../components/Tracker/OnlineTracker';

const TRACKER_MODES = {
  PERIOD: 'period',
  TASK: 'task',
  ONLINE: 'online'
};

const TrackerPage = () => {
  const [mode, setMode] = useState(TRACKER_MODES.PERIOD);

  const handleModeChange = (event) => {
    setMode(event.target.value);
  };

  const renderTracker = () => {
    switch (mode) {
      case TRACKER_MODES.PERIOD:
        return <PeriodTracker />;
      case TRACKER_MODES.TASK:
        return <TaskTracker />;
      case TRACKER_MODES.ONLINE:
        return <OnlineTracker />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Трекер
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Режим </InputLabel>
          <Select
            value={mode}
            onChange={handleModeChange}
            label="Режим "
          >
            <MenuItem value={TRACKER_MODES.PERIOD}>За период</MenuItem>
            <MenuItem value={TRACKER_MODES.TASK}>По задаче</MenuItem>
            <MenuItem value={TRACKER_MODES.ONLINE}>Онлайн</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Paper sx={{ p: 3 }}>
        {renderTracker()}
      </Paper>
    </Box>
  );
};

export default TrackerPage; 