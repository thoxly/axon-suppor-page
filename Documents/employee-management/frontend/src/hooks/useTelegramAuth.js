import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { isTelegramWebApp, getTelegramUser } from '../utils/telegram';

const useTelegramAuth = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkTelegramAuth = async () => {
            if (!isTelegramWebApp()) {
                setLoading(false);
                return;
            }

            try {
                const telegramUser = getTelegramUser();
                if (!telegramUser?.id) {
                    throw new Error('Telegram user data not available');
                }

                const response = await api.auth.checkTelegramUser(telegramUser.id);
                if (response.user) {
                    setUser(response.user);
                }
            } catch (error) {
                console.error('Telegram auth error:', error);
                if (error.response?.status === 404) {
                    setError('Пользователь не найден. Необходима регистрация через инвайт-код.');
                } else {
                    setError('Ошибка авторизации');
                }
            } finally {
                setLoading(false);
            }
        };

        checkTelegramAuth();
    }, []);

    return {
        user,
        loading,
        error,
        isWebApp: isTelegramWebApp()
    };
};

export default useTelegramAuth; 