const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: "No token provided!" });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.id;
    console.log('Token verified, userId:', req.userId);
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ message: "Unauthorized!" });
  }
};

const loadUser = async (req, res, next) => {
  try {
    console.log('Loading user data for userId:', req.userId);
    const { rows } = await db.query(
      'SELECT id, email, role, company_id, onboarding_completed FROM users WHERE id = $1',
      [req.userId]
    );

    if (!rows[0]) {
      console.error('User not found for userId:', req.userId);
      return res.status(404).json({ message: "User not found!" });
    }

    req.user = rows[0];
    console.log('User data loaded:', req.user);
    next();
  } catch (err) {
    console.error('Error loading user data:', err);
    return res.status(500).json({ message: "Server error while loading user data" });
  }
};

const checkManagerOnboarding = async (req, res, next) => {
  try {
    console.log('checkManagerOnboarding - User:', {
      role: req.user.role,
      onboarding_completed: req.user.onboarding_completed,
      path: req.path,
      originalUrl: req.originalUrl
    });
    
    if (req.user.role === 'manager' && !req.user.onboarding_completed) {
      console.log('Manager without completed onboarding detected');
      if (req.path.includes('/company') || req.originalUrl.includes('/company')) {
        console.log('Allowing company-related endpoint');
        // Allow company-related endpoints for managers even if onboarding is not completed
        next();
      } else {
        console.log('Blocking non-company endpoint for manager without onboarding');
        return res.status(403).json({
          message: "Please complete company setup first!",
          needsOnboarding: true,
          companyId: req.user.company_id
        });
      }
    } else {
      console.log('User passes onboarding check');
      next();
    }
  } catch (err) {
    console.error('Error in checkManagerOnboarding:', err);
    return res.status(500).json({ message: "Server error while checking onboarding status" });
  }
};

const isManager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'manager') {
        return res.status(403).json({ message: 'Access denied. Manager role required.' });
    }

    next();
};

const isEmployee = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'employee') {
        return res.status(403).json({ message: 'Access denied. Employee role required.' });
    }

    next();
};

const isManagerOrEmployee = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'manager' && req.user.role !== 'employee') {
        return res.status(403).json({ message: 'Access denied. Manager or Employee role required.' });
    }

    next();
};

// New optional middleware that verifies JWT only if present
const verifyTokenOptional = (req, res, next) => {
  const tokenHeader = req.headers['authorization'];

  // If no token header – just skip verification and continue
  if (!tokenHeader) {
    return next();
  }

  const token = tokenHeader.split(' ')[1];

  if (!token) {
    // Malformed header – treat as absent (do not block request)
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.id;
    console.log('Optional token verified, userId:', req.userId);
    next();
  } catch (err) {
    console.error('Optional token verification failed, ignoring token:', err?.message);
    // Invalid token – continue WITHOUT setting userId
    next();
  }
};

// Loads user data only if verifyTokenOptional has set req.userId
const loadUserOptional = async (req, res, next) => {
  if (!req.userId) {
    return next();
  }

  try {
    const { rows } = await db.query(
      'SELECT id, email, role, company_id, onboarding_completed FROM users WHERE id = $1',
      [req.userId]
    );

    if (!rows[0]) {
      console.error('User not found for optional load, userId:', req.userId);
      return next();
    }

    req.user = rows[0];
    console.log('User data loaded (optional):', req.user);
    next();
  } catch (err) {
    console.error('Error loading user data (optional):', err);
    next();
  }
};

// Middleware для загрузки пользователя по telegram_id из query параметров
const loadUserByTelegramId = async (req, res, next) => {
  const telegramId = req.query.telegram_id;

  if (!telegramId) {
    return next();
  }

  try {
    console.log('Loading user by telegram_id:', telegramId);
    const { rows } = await db.query(
      'SELECT id, email, role, company_id, onboarding_completed, telegram_id, full_name, username FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (!rows[0]) {
      console.error('User not found for telegram_id:', telegramId);
      return res.status(404).json({ message: "User not found!" });
    }

    req.user = rows[0];
    console.log('User data loaded by telegram_id:', req.user);
    next();
  } catch (err) {
    console.error('Error loading user data by telegram_id:', err);
    return res.status(500).json({ message: "Server error while loading user data" });
  }
};

module.exports = {
    verifyToken,
    verifyTokenOptional,
    loadUser,
    loadUserOptional,
    loadUserByTelegramId,
    checkManagerOnboarding,
    isManager,
    isEmployee,
    isManagerOrEmployee
}; 