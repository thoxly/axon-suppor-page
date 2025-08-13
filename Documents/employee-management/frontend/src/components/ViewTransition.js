import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

const ViewTransition = ({ children, active, direction = 'slide' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (active) {
      setShouldRender(true);
      // Небольшая задержка для начала анимации
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Ждем окончания анимации перед удалением из DOM
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [active]);

  if (!shouldRender) return null;

  const getTransitionStyles = () => {
    const baseStyles = {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    };

    if (direction === 'fade') {
      return {
        ...baseStyles,
        transform: 'none',
      };
    }

    if (direction === 'scale') {
      return {
        ...baseStyles,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
      };
    }

    return baseStyles;
  };

  return (
    <Box sx={getTransitionStyles()}>
      {children}
    </Box>
  );
};

export default ViewTransition; 