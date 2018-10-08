const pool = require('../utils/sqlConnectionPool').pool;

const auth = require('../middleware/auth');

const express = require('express');

const router = express.Router();

module.exports = router;

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.request().query(
            `SELECT Name FROM Events`
        );

        res.send(result.recordset);
    } catch (err) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', err);
        return;
    }
});