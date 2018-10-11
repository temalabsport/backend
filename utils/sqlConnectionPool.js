const config = require('config');
const sql = require('mssql');

const pool = new sql.ConnectionPool(config.get('sqlConnString'));

exports.init = async function () {
    try {
        await pool.connect()
        console.log("Connected to sport-temalabor database");
    } catch (err) {
        console.log('CRITICAL ERROR : Could not connect to database', err);
        process.exit(1);
    }
}

exports.pool = pool;