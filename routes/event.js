const pool = require('../utils/sqlConnectionPool').pool;
const auth = require('../middleware/auth');

const Joi = require('joi');
const express = require('express');

const router = express.Router();

module.exports = router;

router.get('/search', auth, async (req, res) => {
    const result = Joi.validate(req.query, eventSearchQueryParamsSchema);
    if (result.error) {
        res.status(400).send(result.error.details[0].message);
        return;
    }

    const params = result.value;

    try {
        const searchRequest = await pool.request();
        searchRequest.input('SPORT', params.sport);
        searchRequest.input('DATE_FROM', params.dateFrom);
        searchRequest.input('DATE_TO', params.dateTo);
        searchRequest.input('ORDER_BY', params.orderBy);
        searchRequest.input('PAGE_SIZE', params.pageSize);
        searchRequest.input('PAGE', params.page);
        searchRequest.output('TOTAL_RESULTS');
        searchRequest.output('TOTAL_PAGES');
        let result = await searchRequest.execute('GetEvents');
        const ret = {
            results: result.recordset,
            totalResults: result.output.TOTAL_RESULTS,
            totalPages: result.output.TOTAL_PAGES
        }
        res.send(ret);
        return;
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

router.post('/new', auth, async (req, res) => {
    const result = Joi.validate(req.body, newEventSchema);

    if (result.error) {
        res.status(400).send(result.error.details[0].message);
        return;
    }

    const newEvent = result.value;

    try {
        const sportRequest = pool.request();
        sportRequest.input('SPORT', newEvent.sport)
        const sportResult = await sportRequest.query(
            `SELECT ID FROM Sports WHERE Name = @SPORT`
        );
        if (sportResult.recordset.length !== 1) {
            res.status(400).send('Sport not found');
            return;
        }

        const sportID = sportResult.recordset[0].ID;

        const userRequest = pool.request();
        userRequest.input('USERNAME', req.user.userName);
        const userResult = await userRequest.query(
            `SELECT ID FROM Users WHERE UserName = @USERNAME`
        );
        if (userResult.recordset.length !== 1) {
            res.status(500).send('Server Error');
            console.log('WARNING : ', 'valid token used without registered username pair in database');
            return;
        }

        const userID = userResult.recordset[0].ID;

        const insertRequest = pool.request();
        insertRequest.input('SPORT_ID', sportID);
        insertRequest.input('USER_ID', userID);
        insertRequest.input('NAME', newEvent.name);
        insertRequest.input('LOCATION', newEvent.location);
        insertRequest.input('DATE', newEvent.date);
        insertRequest.input('DEADLINE', newEvent.deadline);
        insertRequest.input('DESCRIPTION', newEvent.description);
        await insertRequest.query(
            `INSERT INTO Events (SportID, UserID, Name, Location, Date, Deadline, Description) VALUES ( @SPORT_ID, @USER_ID, @NAME, @LOCATION, @DATE, @DEADLINE, @DESCRIPTION )`
        );

        res.status(201).send('Event successfully created');
        return;
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

const newEventSchema = Joi.object().keys({
    sport: Joi.string().required(),
    name: Joi.string().required(),
    location: Joi.string().required(),
    date: Joi.date().iso().required(),
    deadline: Joi.date().iso().min(Joi.ref('date')).required(),
    description: Joi.string().required()
}).options({ stripUnknown: true });

const eventSearchQueryParamsSchema = Joi.object().keys({
    sport: Joi.string(),
    dateFrom: Joi.date().iso().default(() => new Date().toISOString(), 'current time'),
    dateTo: Joi.date().iso(),
    orderBy: Joi.string().valid('date', 'deadline', 'name', 'location').default('date'),
    pageSize: Joi.number().min(1).max(100).default(10),
    page: Joi.number().min(1).default(1)
}).options({ stripUnknown: true });


