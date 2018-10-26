const pool = require('../utils/sqlConnectionPool').pool;
const auth = require('../middleware/auth');

const Joi = require('joi');
const express = require('express');
const sql = require('mssql');

const router = express.Router();

module.exports = router;

router.get('/search', auth, async (req, res) => {
    const validateResult = Joi.validate(req.query, eventSearchQueryParamsSchema);
    if (validateResult.error) {
        res.status(400).send(validateResult.error.details[0].message);
        return;
    }

    const params = validateResult.value;

    try {
        const searchRequest = await pool.request();
        //searchRequest.input('USERNAME', params.userName);
        searchRequest.input('SPORT', params.sport);
        searchRequest.input('DATE_FROM', params.dateFrom);
        searchRequest.input('DATE_TO', params.dateTo);
        searchRequest.input('ORDER_BY', params.orderBy);
        searchRequest.input('PAGE_SIZE', params.pageSize);
        searchRequest.input('PAGE', params.page);
        searchRequest.output('TOTAL_RESULTS');
        searchRequest.output('TOTAL_PAGES');
        const searchResult = await searchRequest.execute('GetEvents');
        const ret = {
            results: searchResult.recordset,
            totalResults: searchResult.output.TOTAL_RESULTS,
            totalPages: searchResult.output.TOTAL_PAGES
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
    const validateResult = Joi.validate(req.body, newEventSchema);

    if (validateResult.error) {
        res.status(400).send(validateResult.error.details[0].message);
        return;
    }

    const newEvent = validateResult.value;

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

router.post('/apply', auth, async (req, res) => {
    const validateResult = Joi.validate(req.body, eventApplySchema);

    if (validateResult.error) {
        res.status(400).send(validateResult.error.details[0].message);
        return;
    }

    const params = validateResult.value;

    try {
        const applyRequest = pool.request();
        applyRequest.input('EventID', params.eventID);
        applyRequest.input('Creator', req.user.userName);
        applyRequest.input('TeamName', params.teamName);
        const tvp = new sql.Table();
        tvp.columns.add('UserName', sql.VarChar(20));
        params.members.forEach(userName => {
            tvp.rows.add(userName);
        });
        applyRequest.input('UserNameList', tvp);

        await applyRequest.execute('ApplyForEvent');
        res.status(201).send("Successfully applied for Event");
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
    userName: Joi.string(),
    sport: Joi.string(),
    dateFrom: Joi.date().iso().default(() => new Date().toISOString(), 'current time'),
    dateTo: Joi.date().iso(),
    orderBy: Joi.string().valid('date', 'deadline', 'name', 'location').default('date'),
    pageSize: Joi.number().min(1).max(100).default(10),
    page: Joi.number().min(1).default(1)
}).options({ stripUnknown: true });

const eventApplySchema = Joi.object().keys({
    eventID: Joi.number().required(),
    teamName: Joi.string().min(5).required(),
    members: Joi.array().items(Joi.string()).min(1).required()
}).options({ stripUnknown: true });
