import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const useAuth = () => {
    const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [loading, setLoading] = useState(true);
    
    // Определяем контекст приложения
    const currentPath = window.location.pathname;
    const isMiniApp = currentPath.startsWith('/my-app');
    const isTelegramWebApp = window.Telegram?.WebApp?.initData?.length > 0;

    const refreshAccessToken = useCallback(async () => {
        try {
            console.log('Attempting to refresh token');
            const data = await api.auth.refreshToken();
            if (data.accessToken && data.user) {
                console.log('Token refreshed successfully');
                setAccessToken(data.accessToken);
                setUser(data.user);
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            }
            console.log('Token refresh failed - no token or user in response');
            return false;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            logout();
            return false;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const initializeAuth = useCallback(async () => {
        console.log('Initializing auth:', {
            isMiniApp,
            isTelegramWebApp,
            hasToken: Boolean(localStorage.getItem('accessToken')),
            hasUser: Boolean(localStorage.getItem('user'))
        });

        // Если это Mini App, не пытаемся восстановить сессию из localStorage
        if (isMiniApp || isTelegramWebApp) {
            console.log('Skipping localStorage auth for Mini App');
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            try {
                console.log('Restoring auth from localStorage');
                setAccessToken(token);
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error('Error during auth initialization:', error);
                logout();
            }
        } else {
            console.log('No stored auth data found');
        }
        setLoading(false);
    }, [isMiniApp, isTelegramWebApp]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    const login = useCallback((token, userData) => {
        console.log('useAuth: Login called:', { 
            hasToken: Boolean(token), 
            hasUserData: Boolean(userData),
            userData: userData,
            isMiniApp,
            isTelegramWebApp 
        });

        // В Mini App не сохраняем данные в localStorage
        if (!isMiniApp && !isTelegramWebApp) {
            localStorage.setItem('accessToken', token);
            localStorage.setItem('user', JSON.stringify(userData));
        }
        setAccessToken(token);
        setUser(userData);
        
        console.log('useAuth: State updated:', {
            accessToken: Boolean(token),
            user: Boolean(userData),
            isAuthenticated: isMiniApp ? !!userData : !!token
        });
    }, [isMiniApp, isTelegramWebApp]);

    const logout = useCallback(() => {
        console.log('Logout called');
        if (!isMiniApp && !isTelegramWebApp) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
        }
        setAccessToken(null);
        setUser(null);
    }, [isMiniApp, isTelegramWebApp]);

    const updateUser = useCallback((userData) => {
        console.log('Updating user data');
        if (!isMiniApp && !isTelegramWebApp) {
            localStorage.setItem('user', JSON.stringify(userData));
        }
        setUser(userData);
    }, [isMiniApp, isTelegramWebApp]);

    const isManager = useCallback(() => {
        return user?.role === 'manager';
    }, [user]);

    const isEmployee = useCallback(() => {
        return user?.role === 'employee';
    }, [user]);

    return {
        accessToken,
        user,
        // Для мини-апп считаем авторизованным если есть user, для веб - если есть accessToken
        isAuthenticated: isMiniApp ? !!user : !!accessToken,
        isManager,
        isEmployee,
        login,
        logout,
        loading,
        refreshAccessToken,
        updateUser
    };
};

export default useAuth; 