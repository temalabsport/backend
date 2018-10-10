const pool = require('../utils/sqlConnectionPool').pool;
const Joi = require('joi');

const auth = require('../middleware/auth');

const express = require('express');

const router = express.Router();

module.exports = router;

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.request().query(
            'SELECT Name FROM Events'
        );

        res.send(result.recordset);
    } catch (err) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', err);
        return;
    }
});

router.post('/new', async (req, res) => {
    let result = Joi.validate(req.body, EventsSchema);

    if (result.error) {
        res.status(400).send(result.error.details[0].message);
        return;
    }
    const event = result.value;

    

    try {
       const sport = await pool.request().query(
            `SELECT ID FROM Sports WHERE  Name = '${event.sportname}'`
        );
            //res.send(sport.recordset[0]);
        if (sport.recordset.length === 0) {
            res.status(409).send('This sport category does not exist');
            return;
        }

        const user = await pool.request().query(
            `SELECT ID FROM Users WHERE UserName = '${event.creator}'`
        );
        if (user.recordset.length === 0) {
            res.status(410).send('User is not found');
            return;
        }
        
        result = await pool.request().query(
            `INSERT INTO Events (SportID, UserID, Name, Location,Date, Description) VALUES (${sport.recordset[0].ID}, ${user.recordset[0].ID}, '${event.name}', '${event.location}', '${event.datetime}', '${event.description}')`
        );
    } catch (err) {
        res.status(500).send('Server eror');
        console.log('DATABASE ERROR : ', err);
        return;
    }

    res.status(201).send('Event registered successfully');
});

const EventsSchema = Joi.object().keys({
    sportname: Joi.string().required(),
    creator: Joi.string().min(5).max(20).required(),
    name: Joi.string().required(),
    location: Joi.string().required(),
    datetime: Joi.string().required(),
    description: Joi
});



