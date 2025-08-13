import React from 'react';
import { Fade, Slide, Grow } from '@mui/material';

const AnimatedView = ({ children, in: inProp = true, direction = 'left', timeout = 300 }) => {
  return (
    <Slide direction={direction} in={inProp} timeout={timeout}>
      <div>
        <Fade in={inProp} timeout={timeout}>
          <div>
            {children}
          </div>
        </Fade>
      </div>
    </Slide>
  );
};

export default AnimatedView; 