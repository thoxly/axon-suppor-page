require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3003,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'employee_management',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
    },
    telegram: {
        botToken: process.env.BOT_TOKEN,
        webAppUrl: process.env.TELEGRAM_WEBAPP_URL || 'https://your-domain.com'
    },
    s3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucketName: process.env.S3_BUCKET_NAME || 'arrive-fr-reports',
        endpoint: process.env.S3_ENDPOINT || 'https://s3.regru.cloud'
    },
    corsOptions: {
        origin: function(origin, callback) {
            // В режиме разработки разрешаем запросы без origin и с localhost
            if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
                console.log('Development request:', origin);
                return callback(null, true);
            }

            // Список разрешенных доменов
            const allowedDomains = [
                'http://localhost:3000',
                'http://localhost:3002',
                'http://localhost:3003',
                'https://2adbc769f69a.ngrok.app', 
                'https://athletes-cache-legitimate-dubai.trycloudflare.com', 
                'https://dev.прибыл.рф',

            ];

            // Регулярные выражения для динамических доменов
            const allowedPatterns = [
                /^https:\/\/.*\.ngrok\.app$/,
                /^https:\/\/.*\.ngrok\.io$/,
                /^https:\/\/[a-z\-]+\.trycloudflare\.com$/,
                /^https:\/\/[a-zA-Z0-9-]+\.ngrok(?:\.app|\.io)$/,
                /^https:\/\/[a-f0-9]+\.ngrok\.app$/,  
                /^https:\/\/[a-f0-9]+\.ngrok\.io$/,
                /^https:\/\/.*\.t\.me$/, 
                /^https:\/\/web\.telegram\.org$/
            ];

            console.log('Checking origin:', origin);

            // Проверяем точные совпадения
            if (allowedDomains.includes(origin)) {
                console.log('Origin matched in allowed domains:', origin);
                return callback(null, true);
            }

            // Проверяем регулярные выражения
            const matchedPattern = allowedPatterns.find(pattern => pattern.test(origin));
            if (matchedPattern) {
                console.log('Origin matched pattern:', origin, matchedPattern);
                return callback(null, true);
            }

            console.log('Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Credentials'
        ],
        exposedHeaders: [
            'Content-Range',
            'X-Content-Range',
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Credentials'
        ],
        preflightContinue: false,
        optionsSuccessStatus: 204,
        maxAge: 86400 // 24 hours
    }
}; 