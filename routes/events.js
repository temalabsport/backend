const pool = require('../utils/sqlConnectionPool').pool;
const auth = require('../middleware/auth');

const Joi = require('joi');
const express = require('express');

const router = express.Router();

module.exports = router;

router.get('/', auth, async (req, res) => {
    const result = Joi.validate(req.query, eventsSearchQueryParams);
    if (result.error) {
        res.status(400).send(result.error.details[0].message);
        return;
    }

    const params = result.value;

    try {
        const request = await pool.request();
        request.input('SPORTNAME', params.sportName);
        request.input('DATE_FROM', params.dateFrom);
        request.input('DATE_TO', params.dateTo);
        request.input('PAGE_SIZE', params.pageSize);
        request.input('PAGE', params.page);
        let result = await request.execute('GetEvents');
        res.send(result.recordset);
        return;
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

router.post('/new', auth, async (req, res) => {
    let result = Joi.validate(req.body, NewEventsSchema);

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
        console.log(req.user.userName);
        const user = await pool.request().query(
            `SELECT ID FROM Users WHERE UserName = '${req.user.userName}'`
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

const NewEventsSchema = Joi.object().keys({
    sportname: Joi.string().required(),
    name: Joi.string().required(),
    location: Joi.string().required(),
    datetime: Joi.string().required(),
    description: Joi
}).options({ stripUnknown: true });

const eventsSearchQueryParams = Joi.object().keys({
    sportName: Joi.string(),
    dateFrom: Joi.date().iso().default(() => new Date().toISOString(), 'current time'),
    dateTo: Joi.date().iso(),
    pageSize: Joi.number().min(1).max(100).default(10),
    page: Joi.number().min(1).default(1)
}).options({ stripUnknown: true });


