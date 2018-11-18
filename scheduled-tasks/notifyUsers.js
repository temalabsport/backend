const pool = require('../utils/sqlConnectionPool').pool;
const emailClient = require('../utils/emailClient');

module.exports = async () => {
    try {
        const notifyRequest = await pool.request();
        const date = new Date();
        date.setDate(date.getDate() + 1);
        notifyRequest.input('Date', date.toISOString());
        const notifyResult = await notifyRequest.execute('GetNotifyList');

        notifyResult.recordset.forEach(record => {
            emailClient.sendTest(record.Email);
        });
    } catch (error) {
        console.log('NOTIFY ERROR : ', error);
        return;
    }
}