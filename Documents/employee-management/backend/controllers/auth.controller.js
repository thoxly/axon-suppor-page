const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const config = require('../config');
const { verifyTelegramWebAppData, sendRegistrationSuccessMessage } = require('../utils/telegram');

const JWT_ACCESS_SECRET = config.jwtSecret;
const JWT_REFRESH_SECRET = config.jwtSecret;

const generateTokens = async (user) => {
    // Generate access token
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, company_id: user.company_id },
        JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    try {
        await pool.query('BEGIN');

        // Удаляем все существующие refresh tokens для пользователя
        await pool.query(
            'DELETE FROM refresh_tokens WHERE user_id = $1',
            [user.id]
        );

        // Store new refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        try {
            await pool.query(
                'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [user.id, refreshToken, expiresAt]
            );
        } catch (error) {
            // Если токен уже существует, это не критическая ошибка
            if (error.code === '23505' && error.constraint === 'refresh_tokens_token_key') {
                console.log('Refresh token already exists, continuing...');
            } else {
                throw error;
            }
        }

        await pool.query('COMMIT');
    } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }

    return { accessToken, refreshToken };
};

const registerByEmail = async (req, res) => {
    try {
        const { email, password, full_name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: 'User already exists' });
        }
        
        const password_hash = await bcrypt.hash(password, 10);
        
        // Set role as 'manager' for direct email registration
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, full_name, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role',
            [email, password_hash, full_name || null, 'manager', 'active']
        );
        const user = result.rows[0];
        
        const { accessToken, refreshToken } = await generateTokens(user);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            user,
            accessToken
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const registerByInviteCode = async (req, res) => {
    try {
        const { inviteCode, telegramId, firstName, lastName, username, photoUrl } = req.body;
        
        if (!inviteCode || !telegramId) {
            return res.status(400).json({ 
                message: 'Инвайт-код и Telegram ID обязательны' 
            });
        }

        // Поиск пользователя по инвайт-коду
        const userResult = await pool.query(
            'SELECT * FROM users WHERE invite_code = $1',
            [inviteCode]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Инвайт-код не найден или недействителен' 
            });
        }

        const user = userResult.rows[0];

        if (!user.company_id) {
            return res.status(400).json({ 
                message: 'Ошибка регистрации: у пригласившего пользователя не указана компания' 
            });
        }

        // Проверяем, не привязан ли уже этот Telegram ID к другому пользователю
        const existingTelegramUser = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [telegramId]
        );

        if (existingTelegramUser.rows.length > 0) {
            return res.status(409).json({ 
                message: 'Этот Telegram аккаунт уже привязан к другому пользователю' 
            });
        }

        // Обновляем данные пользователя
        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        
        const updateResult = await pool.query(
            `UPDATE users 
             SET telegram_id = $1, 
                 full_name = COALESCE($2, full_name), 
                 username = $3, 
                 status = 'active', 
                 onboarding_completed = FALSE,
                 company_id = $4,
                 manager_id = $5,
                 photo_url = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 
             RETURNING id, telegram_id, full_name, username, role, status, onboarding_completed, company_id, manager_id, photo_url`,
            [telegramId, fullName, username, user.company_id, user.id, user.id, photoUrl]
        );

        const updatedUser = updateResult.rows[0];

        // Отправляем сообщение об успешной регистрации в Telegram
        try {
            await sendRegistrationSuccessMessage(telegramId, updatedUser.full_name);
        } catch (telegramError) {
            console.error('Error sending Telegram message:', telegramError);
            // Не прерываем регистрацию, если не удалось отправить сообщение
        }

        // Генерируем токены
        const { accessToken, refreshToken } = await generateTokens(updatedUser);

        // Устанавливаем refresh token в HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
        });

        res.status(200).json({
            message: 'Регистрация успешно завершена',
            user: {
                id: updatedUser.id,
                telegram_id: updatedUser.telegram_id,
                full_name: updatedUser.full_name,
                username: updatedUser.username,
                role: updatedUser.role,
                status: updatedUser.status,
                onboarding_completed: updatedUser.onboarding_completed,
                company_id: updatedUser.company_id,
                manager_id: updatedUser.manager_id,
                photo_url: updatedUser.photo_url
            },
            accessToken
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const loginByEmail = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }
        
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ message: 'Неверный пароль' });
        }

        const { accessToken, refreshToken } = await generateTokens(user);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true, // Always use secure for cross-domain
            sameSite: 'none', // Allow cross-domain
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                company_id: user.company_id,
                onboarding_completed: user.onboarding_completed
            },
            accessToken
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const refreshToken = async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        
        const oldRefreshToken = req.cookies.refreshToken;
        
        if (!oldRefreshToken) {
            return res.status(401).json({ message: 'Refresh token required' });
        }

        try {
            await client.query('BEGIN');

            const payload = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);

            const userResult = await client.query(
                'SELECT id, email, role, full_name, company_id, onboarding_completed FROM users WHERE id = $1',
                [payload.id]
            );

            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(401).json({ message: 'User not found' });
            }

            const user = userResult.rows[0];

            const tokenResult = await client.query(
                'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW() FOR UPDATE',
                [oldRefreshToken, user.id]
            );

            if (tokenResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(401).json({ message: 'Invalid refresh token' });
            }

            await client.query('DELETE FROM refresh_tokens WHERE token = $1', [oldRefreshToken]);

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const accessToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_ACCESS_SECRET,
                { expiresIn: '15m' }
            );

            const newRefreshToken = jwt.sign(
                { id: user.id },
                JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            await client.query(
                'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [user.id, newRefreshToken, expiresAt]
            );

            await client.query('COMMIT');

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({
                user,
                accessToken
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        
        if (refreshToken) {
            await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        }

        res.clearCookie('refreshToken', '', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 0
        });
        
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const validateInviteCode = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        
        if (!inviteCode) {
            return res.status(400).json({ 
                message: 'Инвайт-код обязателен' 
            });
        }

        // Поиск пользователя по инвайт-коду
        const userResult = await pool.query(
            'SELECT id, telegram_id FROM users WHERE invite_code = $1',
            [inviteCode]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Инвайт-код не найден или недействителен' 
            });
        }

        const user = userResult.rows[0];
        
        // Проверяем, не привязан ли уже к этому пользователю Telegram
        if (user.telegram_id) {
            return res.status(409).json({ 
                message: 'Этот инвайт-код уже был использован' 
            });
        }

        res.json({ 
            message: 'Инвайт-код действителен',
            valid: true
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const checkTelegramUser = async (req, res) => {
    try {
        console.log('=== CHECK TELEGRAM USER REQUEST ===');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Method:', req.method);
        console.log('URL:', req.originalUrl);
        console.log('Origin:', req.headers.origin);
        
        const { telegramId } = req.body;
        
        if (!telegramId) {
            console.log('Missing telegramId');
            return res.status(400).json({ message: 'Telegram ID is required' });
        }

        const userResult = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [telegramId]
        );

        if (userResult.rows.length === 0) {
            return res.json({ exists: false });
        }

        const user = userResult.rows[0];
        
        res.json({
            exists: true,
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                full_name: user.full_name,
                username: user.username,
                role: user.role,
                status: user.status,
                onboarding_completed: user.onboarding_completed,
                company_id: user.company_id
            }
        });
    } catch (error) {
        console.error('Error checking telegram user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const telegramId = req.user?.telegram_id;
        
        if (!userId && !telegramId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        let userResult;
        if (telegramId) {
            userResult = await pool.query(
                'SELECT id, email, role, full_name, company_id, onboarding_completed, telegram_id, username FROM users WHERE telegram_id = $1',
                [telegramId]
            );
        } else {
            userResult = await pool.query(
                'SELECT id, email, role, full_name, company_id, onboarding_completed, telegram_id, username FROM users WHERE id = $1',
                [userId]
            );
        }

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];
        
        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            company_id: user.company_id,
            onboarding_completed: user.onboarding_completed,
            telegram_id: user.telegram_id,
            username: user.username
        });
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const telegramWebAppAuth = async (req, res) => {
    try {
        console.log('=== TELEGRAM WEB APP AUTH REQUEST ===');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Method:', req.method);
        console.log('URL:', req.originalUrl);
        console.log('Origin:', req.headers.origin);
        console.log('User-Agent:', req.headers['user-agent']);
        
        const { initData } = req.body;
        
        if (!initData) {
            console.log('Missing initData');
            return res.status(400).json({ message: 'initData is required' });
        }

        console.log('Verifying Telegram Web App data...');
        // Verify Telegram Web App initData
        if (!verifyTelegramWebAppData(initData)) {
            console.log('Telegram Web App data verification failed');
            return res.status(401).json({ message: 'Invalid Telegram Web App data' });
        }

        // Extract telegram_id from initData
        const urlParams = new URLSearchParams(initData);
        const userStr = urlParams.get('user');
        
        if (!userStr) {
            console.log('No user data in initData');
            return res.status(400).json({ message: 'User data not found in initData' });
        }

        let telegramUser;
        try {
            telegramUser = JSON.parse(decodeURIComponent(userStr));
        } catch (error) {
            console.error('Error parsing user data:', error);
            return res.status(400).json({ message: 'Invalid user data format' });
        }

        const telegramId = telegramUser.id;
        
        if (!telegramId) {
            console.log('No telegram_id in user data');
            return res.status(400).json({ message: 'Telegram ID not found in user data' });
        }

        console.log('Extracted telegram_id:', telegramId);

        // Find user by telegram_id
        const userResult = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [telegramId]
        );

        if (userResult.rows.length === 0) {
            console.log('User not found in database');
            return res.status(404).json({ 
                message: 'User not found. Please register through the bot first using /start command.',
                needsRegistration: true
            });
        }

        const user = userResult.rows[0];
        console.log('User found:', { id: user.id, full_name: user.full_name, role: user.role });

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                full_name: user.full_name,
                username: user.username,
                role: user.role,
                status: user.status,
                onboarding_completed: user.onboarding_completed,
                company_id: user.company_id
            },
            accessToken
        });
    } catch (error) {
        console.error('Error in Telegram Web App auth:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const registerByTelegram = async (req, res) => {
    try {
        const { telegramId, username, fullName, inviteCode } = req.body;
        
        if (!telegramId || !inviteCode) {
            return res.status(400).json({ message: 'Telegram ID and invite code are required' });
        }

        // Validate invite code
        const inviteResult = await pool.query(
            'SELECT * FROM invite_codes WHERE code = $1 AND used = false AND expires_at > NOW()',
            [inviteCode]
        );

        if (inviteResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired invite code' });
        }

        const invite = inviteResult.rows[0];

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [telegramId]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User with this Telegram ID already exists' });
        }

        // Create user
        const userResult = await pool.query(
            `INSERT INTO users (telegram_id, username, full_name, role, company_id, status, onboarding_completed) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [telegramId, username, fullName, 'employee', invite.company_id, 'active', true]
        );

        // Mark invite code as used
        await pool.query(
            'UPDATE invite_codes SET used = true, used_by = $1, used_at = NOW() WHERE code = $2',
            [userResult.rows[0].id, inviteCode]
        );

        const user = userResult.rows[0];

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                full_name: user.full_name,
                username: user.username,
                role: user.role,
                status: user.status,
                onboarding_completed: user.onboarding_completed,
                company_id: user.company_id
            },
            accessToken
        });
    } catch (error) {
        console.error('Error registering by Telegram:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const loginByTelegram = async (req, res) => {
    try {
        const { telegramId, initData } = req.body;
        
        if (!telegramId || !initData) {
            return res.status(400).json({ message: 'Telegram ID and initData are required' });
        }

        // Verify Telegram Web App initData
        if (!verifyTelegramWebAppData(initData)) {
            return res.status(401).json({ message: 'Invalid Telegram Web App data' });
        }

        // Find user by telegram_id
        const userResult = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [telegramId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];

        // Generate tokens
        const { accessToken, refreshToken } = await generateTokens(user);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                full_name: user.full_name,
                username: user.username,
                role: user.role,
                status: user.status,
                onboarding_completed: user.onboarding_completed,
                company_id: user.company_id
            },
            accessToken
        });
    } catch (error) {
        console.error('Error logging in by Telegram:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    registerByEmail,
    registerByInviteCode,
    registerByTelegram,
    validateInviteCode,
    loginByEmail,
    loginByTelegram,
    refreshToken,
    logout,
    getProfile,
    checkTelegramUser,
    telegramWebAppAuth
}; 