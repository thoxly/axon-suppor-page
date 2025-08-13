const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
    user: config.db.user,
    password: config.db.password,
    host: config.db.host,
    port: config.db.port,
    database: config.db.name
});

module.exports = pool; 