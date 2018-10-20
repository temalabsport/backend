const pool = require('../utils/sqlConnectionPool').pool;

const auth = require('../middleware/auth');

const express = require('express');

const router = express.Router();

module.exports = router;

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.request().query(
            `SELECT Name AS name, MinPlayers AS minPlayers, MaxPlayers AS maxPlayers FROM Sports`
        );
        res.send(result.recordset);
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});