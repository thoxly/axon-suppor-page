import { API_URLS } from '../config/urls';

console.log('=== API MODULE LOADED ===');
console.log('API_URLS imported:', API_URLS);

// Простая и надежная логика определения API URL
const getApiBaseUrl = () => {
    const currentPath = window.location.pathname;
    const currentDomain = window.location.origin;
    
    console.log('=== API URL DETERMINATION ===');
    console.log('Current path:', currentPath);
    console.log('Current domain:', currentDomain);
    console.log('API_URLS.tunnel:', API_URLS.tunnel);
    console.log('API_URLS.local:', API_URLS.local);
    
    // Для Telegram Mini App (все что начинается с /my-app) - всегда туннель
    if (currentPath.startsWith('/my-app')) {
        console.log('Using Telegram Mini App API URL:', API_URLS.tunnel);
        return API_URLS.tunnel;
    }
    
    // Для веб-приложения
    // Если локальный домен - используем localhost
    if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
        console.log('Using localhost API URL for web app');
        return API_URLS.local;
    }
    
    // Если туннельный домен (ngrok) - используем туннельный бэкенд
    if (currentDomain.includes('ngrok.app')) {
        console.log('Using tunnel API URL for web app:', API_URLS.tunnel);
        return API_URLS.tunnel;
    }
    
    // Fallback на localhost
    console.log('Using fallback localhost API URL');
    return API_URLS.local;
};

// Инициализируем базовый URL при загрузке модуля
const API_BASE_URL = getApiBaseUrl();

console.log('API_BASE_URL configured as:', API_BASE_URL);

// Состояние для управления обновлением токена
let isRefreshing = false;
let refreshPromise = null;
let refreshSubscribers = [];

// Функция для добавления подписчиков
const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

// Функция для оповещения подписчиков
const onTokenRefreshed = (token) => {
    refreshSubscribers.forEach(callback => callback(token));
    refreshSubscribers = [];
};

// Функция для отклонения подписчиков
const onRefreshError = (error) => {
    refreshSubscribers.forEach(callback => callback(null, error));
    refreshSubscribers = [];
};

const refreshTokenFn = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        if (data.accessToken && data.user) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            return data.accessToken;
        }
        throw new Error('Invalid refresh token response');
    } catch (error) {
        console.error('Failed to refresh token:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        // Только для веб-приложения редиректим на /login
        // Для мини-апп не делаем редирект
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/my-app') && !window.Telegram?.WebApp) {
            window.location.href = '/login';
        }
        
        throw error;
    }
};

const retryOriginalRequest = async (error, originalRequest) => {
    return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (token, error) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                const response = await fetch(originalRequest.url, {
                    ...originalRequest,
                    headers: {
                        ...originalRequest.headers,
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    });
};

// Отдельная функция для Telegram Mini App API запросов
const miniAppApiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {},
        credentials: 'include',
    };

    // Добавляем Content-Type только если это не FormData
    if (!(options.body instanceof FormData)) {
        defaultOptions.headers['Content-Type'] = 'application/json';
    }

    const requestOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    console.log('Making Mini App API request to:', url);
    console.log('Request options:', JSON.stringify(requestOptions, null, 2));
    console.log('Request body:', options.body);
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
};

export const apiRequest = async (endpoint, options = {}) => {
    const currentPath = window.location.pathname;
    const isMiniApp = currentPath.startsWith('/my-app');
    
    // Для мини-апп используем отдельную логику без токенов
    if (isMiniApp) {
        return miniAppApiRequest(endpoint, options);
    }
    
    // Handle query parameters
    let url = `${API_BASE_URL}${endpoint}`;
    if (options.params) {
        const searchParams = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, value);
            }
        });
        const queryString = searchParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
        // Remove params from options to avoid duplicate handling
        delete options.params;
    }
    
    // Get the access token from localStorage
    const accessToken = localStorage.getItem('accessToken');
    
    const defaultOptions = {
        headers: {
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include', // Always include credentials
    };

    // Добавляем Content-Type только если это не FormData
    if (!(options.body instanceof FormData)) {
        defaultOptions.headers['Content-Type'] = 'application/json';
    }

    const requestOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        console.log('Making API request to:', url);
        console.log('Request options:', JSON.stringify(requestOptions, null, 2));
        console.log('Current origin:', window.location.origin);
        
        const response = await fetch(url, requestOptions);
        console.log('API response status:', response.status);
        console.log('API response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));

        // Для мини-апп не используем логику обновления токенов
        const currentPath = window.location.pathname;
        const isMiniApp = currentPath.startsWith('/my-app');
        
        // Если получили 401 и это не запрос на обновление токена и не запрос на логин/регистрацию
        // И это не мини-апп
        if (response.status === 401 && 
            !isMiniApp &&
            !url.includes('/api/auth/refresh') && 
            !url.includes('/api/auth/login') && 
            !url.includes('/api/auth/register') &&
            !url.includes('/api/auth/telegram-web-app')) {
            
            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = refreshTokenFn();

                try {
                    const newToken = await refreshPromise;
                    isRefreshing = false;
                    refreshPromise = null;
                    onTokenRefreshed(newToken);

                    // Повторяем оригинальный запрос с новым токеном
                    const newOptions = {
                        ...requestOptions,
                        headers: {
                            ...requestOptions.headers,
                            'Authorization': `Bearer ${newToken}`
                        }
                    };
                    const newResponse = await fetch(url, newOptions);
                    if (!newResponse.ok) {
                        throw new Error(`HTTP error! status: ${newResponse.status}`);
                    }
                    return await newResponse.json();
                } catch (error) {
                    onRefreshError(error);
                    throw error;
                }
            } else {
                return retryOriginalRequest(null, { ...requestOptions, url });
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response data:', data);
        return data;
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
};

export const api = {
    auth: {
        register: (data) => apiRequest('/api/auth/register/email', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        registerByInvite: (data) => apiRequest('/api/auth/register/invite', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        registerByTelegram: (data) => apiRequest('/api/auth/register/telegram', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        loginByEmail: (data) => apiRequest('/api/auth/login/email', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        loginByTelegram: (telegramData) => {
            return apiRequest('/api/auth/login/telegram', {
                method: 'POST',
                body: JSON.stringify(telegramData),
            });
        },
        telegramWebAppAuth: (telegramData) => {
            console.log('API: telegramWebAppAuth called with:', telegramData);
            console.log('API: Current API_BASE_URL:', API_BASE_URL);
            
            // Проверяем, что передается только initData
            if (!telegramData.initData) {
                throw new Error('initData is required for Telegram WebApp authentication');
            }
            
            return apiRequest('/api/auth/telegram-web-app', {
                method: 'POST',
                body: JSON.stringify({ initData: telegramData.initData }),
            });
        },
        logout: () => apiRequest('/api/auth/logout', {
            method: 'POST',
        }),
        refreshToken: () => apiRequest('/api/auth/refresh', {
            method: 'POST',
        }),
        getProfile: () => apiRequest('/api/auth/profile', {
            method: 'GET',
        }),
        checkTelegramUser: (telegramId) => apiRequest('/api/auth/check-telegram-user', {
            method: 'POST',
            body: JSON.stringify({ telegramId }),
        }),
    },
    employees: {
        generateInvite: () => apiRequest('/api/employees/generate-invite', {
            method: 'POST',
        }),
        invite: (data) => apiRequest('/api/employees/invite', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getAll: () => apiRequest('/api/employees'),
        update: (id, data) => apiRequest(`/api/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id) => apiRequest(`/api/employees/${id}`, {
            method: 'DELETE',
        }),
        getPositions: (id, startDate, endDate) => 
            apiRequest(`/api/employees/${id}/positions`, {
                method: 'GET',
                params: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                }
        }),
    },
    tasks: {
        getAll: (telegramId) => {
            if (telegramId) {
                return apiRequest(`/api/tasks?telegram_id=${telegramId}`);
            }
            return apiRequest('/api/tasks');
        },
        getForMiniApp: (telegramId) => {
            if (telegramId) {
                return apiRequest(`/api/tasks/mini-app?telegram_id=${telegramId}`);
            }
            return apiRequest('/api/tasks/mini-app');
        },
        getById: (id, telegramId) => {
            if (telegramId) {
                return apiRequest(`/api/tasks/${id}?telegram_id=${telegramId}`);
            }
            return apiRequest(`/api/tasks/${id}`);
        },
        create: (data) => apiRequest('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id, data) => apiRequest(`/api/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id) => apiRequest(`/api/tasks/${id}`, {
            method: 'DELETE',
        }),
        updateStatus: (id, status, telegramId) => {
            const url = telegramId 
                ? `/api/tasks/${id}/status?telegram_id=${telegramId}`
                : `/api/tasks/${id}/status`;
            return apiRequest(url, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
        },
        acceptAssigned: (id, telegramId) => {
            const url = telegramId 
                ? `/api/tasks/${id}/accept-assigned?telegram_id=${telegramId}`
                : `/api/tasks/${id}/accept-assigned`;
            return apiRequest(url, {
                method: 'PATCH',
            });
        },
        takeFree: (id, telegramId) => {
            const url = telegramId 
                ? `/api/tasks/${id}/take-free?telegram_id=${telegramId}`
                : `/api/tasks/${id}/take-free`;
            return apiRequest(url, {
                method: 'PATCH',
            });
        },
        startWork: (id, telegramId) => {
            const url = telegramId 
                ? `/api/tasks/${id}/start-work?telegram_id=${telegramId}`
                : `/api/tasks/${id}/start-work`;
            return apiRequest(url, {
                method: 'PATCH',
            });
        },
        complete: (id, formData, telegramId) => {
            const url = telegramId 
                ? `/api/tasks/${id}/complete?telegram_id=${telegramId}`
                : `/api/tasks/${id}/complete`;
            
            // Для FormData не устанавливаем Content-Type
            const options = {
                method: 'POST',
                body: formData,
            };
            
            // Добавляем токен авторизации
            const accessToken = localStorage.getItem('accessToken');
            if (accessToken) {
                options.headers = {
                    'Authorization': `Bearer ${accessToken}`,
                };
            }
            
            return apiRequest(url, options);
        },
    },
    company: {
        create: (data) => apiRequest('/api/company', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getById: (id) => apiRequest(`/api/company/${id}`),
    },
    sessions: {
        getActiveSession: (telegramId) => {
            const url = telegramId 
                ? `/api/sessions/active?telegram_id=${telegramId}`
                : '/api/sessions/active';
            return apiRequest(url, {
                method: 'GET',
            });
        },
        getUserPositions: (telegramId, limit = 10, sessionId = null) => {
            let url = telegramId 
                ? `/api/sessions/positions?telegram_id=${telegramId}&limit=${limit}`
                : `/api/sessions/positions?limit=${limit}`;
            
            if (sessionId) {
                url += `&sessionId=${sessionId}`;
            }
            
            return apiRequest(url, {
                method: 'GET',
            });
        },
        getCurrentPosition: (telegramId) => {
            const url = telegramId 
                ? `/api/sessions/current-position?telegram_id=${telegramId}`
                : '/api/sessions/current-position';
            return apiRequest(url, {
                method: 'GET',
            });
        },
        // Новый метод для получения текущей позиции сотрудника по ID
        getCurrentPositionById: (employeeId) => {
            return apiRequest(`/api/sessions/current-position?employee_id=${employeeId}`, {
                method: 'GET',
            });
        },
        // Получить сессии для задачи
        getTaskSessions: (taskId) => {
            return apiRequest(`/api/sessions/task/${taskId}`, {
                method: 'GET',
            });
        },
        // Получить позиции для сессии
        getSessionPositions: (sessionId) => {
            return apiRequest(`/api/sessions/${sessionId}/positions`, {
                method: 'GET',
            });
        },
    },
    coordinateProcessing: {
        // Получить обработанные координаты сессии
        getSessionProcessedCoordinates: (sessionId) => {
            return apiRequest(`/api/coordinate-processing/sessions/${sessionId}/coordinates`, {
                method: 'GET',
            });
        },
        // Получить обработанные координаты сессий за период
        getSessionsProcessedCoordinatesForPeriod: (userId, startDate, endDate) => {
            const params = new URLSearchParams({
                userId: userId.toString(),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });
            return apiRequest(`/api/coordinate-processing/sessions/period?${params}`, {
                method: 'GET',
            });
        },
        // Получить статистику сессии
        getSessionStats: (sessionId) => {
            return apiRequest(`/api/coordinate-processing/sessions/${sessionId}/stats`, {
                method: 'GET',
            });
        },
        // Получить обработанные координаты задачи
        getTaskProcessedCoordinates: (taskId) => {
            return apiRequest(`/api/coordinate-processing/tasks/${taskId}/coordinates`, {
                method: 'GET',
            });
        },
        // Получить статистику задачи
        getTaskStats: (taskId) => {
            return apiRequest(`/api/coordinate-processing/tasks/${taskId}/stats`, {
                method: 'GET',
            });
        },
        // Получить настройки обработки
        getProcessingSettings: () => {
            return apiRequest('/api/coordinate-processing/settings', {
                method: 'GET',
            });
        },
        // Обновить настройки обработки (только для менеджеров)
        updateProcessingSettings: (settings) => {
            return apiRequest('/api/coordinate-processing/settings', {
                method: 'PUT',
                body: JSON.stringify(settings),
            });
        },
    },
}; 