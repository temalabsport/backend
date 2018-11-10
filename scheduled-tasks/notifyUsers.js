const pool = require('../utils/sqlConnectionPool').pool

module.exports = async () => {
    try {
        const notifyRequest = await pool.request();
        const date = new Date();
        date.setDate(date.getDate() + 1);
        notifyRequest.input('Date', date.toISOString());
        const notifyResult = await notifyRequest.execute('GetNotifyList');
        console.log(notifyResult);

        // TODO Email küldés
    } catch (error) {
        console.log('DATABASE ERROR : ', error);
        return;
    }
}