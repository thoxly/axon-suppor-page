import React, { useState, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import CompanyFormOffcanvas from './CompanyFormOffcanvas';
import useAuth from '../../hooks/useAuth';

const Layout = ({ children }) => {
  const { user } = useAuth();
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  console.log('Layout: Rendering', { user, showCompanyForm, children });

  useEffect(() => {
    console.log('Layout: useEffect', { 
      isManager: user?.role === 'manager',
      onboardingCompleted: user?.onboarding_completed,
      companyId: user?.company_id 
    });
    
    // Show company form for managers who haven't completed onboarding or don't have a company
    if (user?.role === 'manager' && (!user?.onboarding_completed || !user?.company_id)) {
      setShowCompanyForm(true);
    }
  }, [user]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          mt: 8
        }}
      >
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>

      <CompanyFormOffcanvas
        open={showCompanyForm}
        onClose={() => setShowCompanyForm(false)}
        onSuccess={() => setShowCompanyForm(false)}
      />
    </Box>
  );
};

export default Layout; 