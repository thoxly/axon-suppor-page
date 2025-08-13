import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthContext } from './context/AuthContext';
import Layout from './components/layout/Layout';
import PublicHeader from './components/layout/PublicHeader';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LocationsPage from './pages/LocationsPage';
import TrackerPage from './pages/TrackerPage';
import ReportsPage from './pages/ReportsPage';
import MyAppContainer from './pages/my-app-pages/MyAppContainer';
import CurrentTaskPage from './pages/my-app-pages/CurrentTaskPage';
import TaskDetailsPage from './pages/my-app-pages/TaskDetailsPage';
import TelegramAuthWrapper from './components/TelegramAuthWrapper';

// Ленивая загрузка только для TasksPage и EmployeesPage
const TasksPage = React.lazy(() => import('./pages/TasksPage'));
const EmployeesPage = React.lazy(() => import('./pages/EmployeesPage'));

// Компонент для отображения загрузки
const PageLoader = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="400px"
  >
    <CircularProgress />
  </Box>
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthContext();
  
  console.log('ProtectedRoute:', { isAuthenticated, loading });
  
  if (loading) {
    console.log('ProtectedRoute: Showing loading spinner');
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Redirecting to home');
    return <Navigate to="/" />;
  }
  
  console.log('ProtectedRoute: Rendering children');
  return children;
};

// Web App Routes
const WebAppRoutes = () => {
  const { isAuthenticated, loading } = useAuthContext();
  
  console.log('WebAppRoutes: Rendering', { isAuthenticated, loading });
  
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Показываем PublicHeader только для неавторизованных пользователей */}
      {!isAuthenticated && <PublicHeader />}
      
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Защищенные маршруты */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Navigate to="tasks" replace />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/tasks" element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <TasksPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/employees" element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <EmployeesPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/my-locations" element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <LocationsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/tracker" element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <TrackerPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard/reports" element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <ReportsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Перенаправление для неавторизованных пользователей */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

// Mini App Routes
const MiniAppRoutes = () => {
  console.log('MiniAppRoutes: Rendering');
  return (
    <TelegramAuthWrapper>
      <Routes>
        <Route index element={<MyAppContainer />} />
        <Route path="current-task" element={<CurrentTaskPage />} />
        <Route path="task/:taskId" element={<CurrentTaskPage />} />
        <Route path="task-details/:taskId" element={<TaskDetailsPage />} />
      </Routes>
    </TelegramAuthWrapper>
  );
};

function App() {
  console.log('App: Rendering');

  return (
    <Router>
      <Routes>
        {/* Маршруты для мини-приложения */}
        <Route path="/my-app/*" element={<MiniAppRoutes />} />
        
        {/* Маршруты для веб-приложения */}
        <Route path="/*" element={<WebAppRoutes />} />
      </Routes>
    </Router>
  );
}

export default App; 