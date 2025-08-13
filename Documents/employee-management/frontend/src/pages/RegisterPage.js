import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Container, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { api } from '../utils/api';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuthContext();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Регистрация пользователя
            await api.auth.register({ 
                email, 
                password, 
                full_name: fullName 
            });

            // Автоматический вход после успешной регистрации
            const loginData = await api.auth.loginByEmail({
                email,
                password
            });

            if (loginData.accessToken && loginData.user) {
                login(loginData.accessToken, loginData.user);
                navigate('/dashboard/tasks');
            } else {
                throw new Error('Ошибка при автоматическом входе');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Произошла ошибка при регистрации. Пожалуйста, попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ width: '100%', textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>Регистрация</Typography>
                <form onSubmit={handleSubmit}>
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
                        autoComplete="new-password"
                    />
                    <TextField 
                        label="Имя" 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        fullWidth 
                        margin="normal" 
                        autoComplete="name"
                    />
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mt: 2 }}>
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </Button>
                </form>
                <Button onClick={() => navigate('/login')} sx={{ mt: 2 }} fullWidth>Уже есть аккаунт? Войти</Button>
            </Box>
        </Container>
    );
};

export default RegisterPage; 