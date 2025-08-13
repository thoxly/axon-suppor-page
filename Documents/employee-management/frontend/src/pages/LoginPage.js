import React, { useState } from 'react';
import { Box, Button, Typography, Container, TextField, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { api } from '../utils/api';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuthContext();

    const handleTelegramLogin = () => {
        // TODO: Implement Telegram Login
        window.location.href = `https://oauth.telegram.org/auth?bot_id=YOUR_BOT_ID&origin=YOUR_SITE_URL&return_to=YOUR_REDIRECT_URL`;
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            console.log('Attempting to login with email:', email);
            const data = await api.auth.loginByEmail({ email, password });
            console.log('Login response:', data);
            
            if (data.accessToken && data.user) {
                await login(data.accessToken, data.user);
                navigate('/dashboard/tasks');
            } else {
                throw new Error('Неверный ответ от сервера');
            }
        } catch (err) {
            console.error('Login error:', err);
            if (err.message === 'Failed to fetch') {
                setError('Ошибка подключения к серверу. Пожалуйста, проверьте подключение к интернету и убедитесь, что сервер запущен.');
            } else if (err.message.includes('Пользователь не найден')) {
                setError('Пользователь с таким email не найден. Пожалуйста, проверьте правильность email или зарегистрируйтесь.');
            } else if (err.message.includes('Неверный пароль')) {
                setError('Неверный пароль. Пожалуйста, проверьте правильность ввода.');
            } else {
                setError(err.message || 'Произошла ошибка при входе. Пожалуйста, попробуйте снова.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ width: '100%', textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>Войти</Typography>
                <form onSubmit={handleEmailLogin}>
                    <TextField 
                        label="Email" 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        fullWidth 
                        margin="normal" 
                        required 
                        autoComplete="username"
                    />
                    <TextField 
                        label="Пароль" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        fullWidth 
                        margin="normal" 
                        required 
                        autoComplete="current-password"
                    />
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mt: 2 }}>
                        {loading ? 'Вход...' : 'Войти'}
                    </Button>
                </form>
                <Button variant="outlined" color="primary" fullWidth onClick={handleTelegramLogin} sx={{ mt: 2 }}>
                    Войти через Telegram
                </Button>
                <Button onClick={() => navigate('/register')} sx={{ mt: 2 }} fullWidth>Нет аккаунта? Зарегистрироваться</Button>
            </Box>
        </Container>
    );
};

export default LoginPage; 