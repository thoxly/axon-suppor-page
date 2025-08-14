
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const authRouter = require('./routes/auth.routes');
const employeesRouter = require('./routes/employees.routes');
const tasksRouter = require('./routes/tasks.routes');
const companiesRouter = require('./routes/companies.routes');
const sessionsRouter = require('./routes/sessions.routes');
const coordinateProcessingRouter = require('./routes/coordinateProcessing.routes');

const app = express();

// Глобальный логгер всех входящих HTTP-запросов для отладки
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    next();
});

// Используем cors middleware
app.use(cors(config.corsOptions));

// Добавляем обработку preflight запросов
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
            res.status(204).end();
            return;
        }
    }
    next();
});

// Добавляем обработку ошибок CORS
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        console.error('CORS Error:', {
            origin: req.headers.origin,
            method: req.method,
            path: req.path
        });
        return res.status(403).json({
            error: 'CORS not allowed',
            origin: req.headers.origin
        });
    }
    next(err);
});

// Middleware для парсинга JSON и cookies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Статическая раздача файлов больше не нужна, так как используем S3
// app.use('/uploads', express.static('uploads'));

// Роуты
app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/company', companiesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/coordinate-processing', coordinateProcessingRouter);

app.get('/', (req, res) => {
    res.send('Backend is running');
});

app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
}); 