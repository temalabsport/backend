const pool = require('../utils/sqlConnectionPool').pool;
const auth = require('../middleware/auth');
const admin = require("../middleware/admin");
const ipLocator = require('../utils/ipLocator');
const track = require('../middleware/track');

const Joi = require('joi');
const express = require('express');
const sql = require('mssql');

const router = express.Router();

module.exports = router;

router.get('/search', [auth, track('Example category', 'Example action', 'Example label', '100')], async (req, res) => {
    const validateResult = Joi.validate(req.query, eventSearchQueryParamsSchema);
    if (validateResult.error) {
        res.status(400).send(validateResult.error.details[0].message);
        return;
    }

    const params = validateResult.value;
    if (params.lat == null) {
        const ip = req.ip.substring(0, req.ip.indexOf(":"));
        const location = await ipLocator(ip);
        if (location != null) {
            console.log(`Locating ${ip} -> Lat: ${location.latitude}, Long: ${location.longitude}, Country: ${location.country_name}, City: ${location.city}`);
            params.lat = location.latitude;
            params.long = location.longitude;
        }
    }

    try {
        const searchRequest = await pool.request();
        searchRequest.input('UserName', params.userName);
        searchRequest.input('Sport', params.sport);
        searchRequest.input('DateFrom', params.dateFrom);
        searchRequest.input('DateTo', params.dateTo);
        searchRequest.input('Latitude', params.lat);
        searchRequest.input('Longitude', params.long);
        searchRequest.input('OrderBy', params.orderBy);
        searchRequest.input('PageSize', params.pageSize);
        searchRequest.input('Page', params.page);
        searchRequest.output('TotalResults');
        searchRequest.output('TotalPages');
        const searchResult = await searchRequest.execute('GetEvents');
        const ret = {
            results: searchResult.recordset,
            totalResults: searchResult.output.TotalResults,
            totalPages: searchResult.output.TotalPages,
            latitude: params.lat,
            longitude: params.long
        }
        res.send(ret);
        return;
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

router.get('/:id', auth, async (req, res) => {
    const validateResult = Joi.validate(req.params.id, Joi.number());
    if (validateResult.error) {
        res.status(400).send(validateResult.error.details[0].message);
        return;
    }

    const id = validateResult.value;

    try {
        const eventRequest = pool.request();
        eventRequest.input('ID', id);
        const eventResult = await eventRequest.query(
            `SELECT	Events.Name AS name,
                Events.ID AS eventID,
                CreatorUsers.UserName AS creator,
                Sports.Name AS sport,
                Sports.MinPlayers AS minTeamSize,
                Sports.MaxPlayers AS maxTeamSize,
                Location.Lat AS latitude,
                Location.Long AS longitude,
                Events.LocationName AS location,
                Events.Date AS date,
                Events.Deadline AS deadline,
                Description AS description
            FROM Events
            JOIN Users AS CreatorUsers ON CreatorUsers.ID = Events.UserID
			JOIN Sports ON Sports.ID = Events.SportID
            WHERE Events.ID = @ID`
        );

        if (eventResult.recordset.length !== 1) {
            res.status(400).send('Event not found');
            return;
        } else {
            res.send(eventResult.recordset[0]);
            return;
        }

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
        insertRequest.input('LOCATION_NAME', newEvent.location);
        insertRequest.input('DATE', newEvent.date);
        insertRequest.input('DEADLINE', newEvent.deadline);
        insertRequest.input('DESCRIPTION', newEvent.description);
        await insertRequest.query(
            `INSERT INTO Events (SportID, UserID, Name, Location, LocationName, Date, Deadline, Description) VALUES ( @SPORT_ID, @USER_ID, @NAME, geography::STPointFromText('POINT(${newEvent.longitude} ${newEvent.latitude})', 4326), @LOCATION_NAME, @DATE, @DEADLINE, @DESCRIPTION )`
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
        applyRequest.output('ResultMessage');

        applyResult = await applyRequest.execute('ApplyForEvent');

        switch (applyResult.returnValue) {
            case 0:
                res.status(201).send(applyResult.output.ResultMessage);
                return;
            case 1:
                res.status(400).send(applyResult.output.ResultMessage);
                return;

            default:
                res.status(500).send("Server error");
                return;
        }
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

router.delete("/old", [auth, admin], async (req, res) => {
    try {
        const deleteOldEventRequest = pool.request();
        const deleteResult = await deleteOldEventRequest.query(
            `DELETE FROM Events WHERE Date < SYSDATETIME()`
        );
        res.send(`${deleteResult.rowsAffected} events deleted`);
        return;
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});


const newEventSchema = Joi.object().keys({
    sport: Joi.string().required(),
    name: Joi.string().max(50).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    location: Joi.string().max(100).required(),
    date: Joi.date().iso().required(),
    deadline: Joi.date().iso().max(Joi.ref('date')).required(),
    description: Joi.string().max(300).required()
}).options({ stripUnknown: true });

const eventSearchQueryParamsSchema = Joi.object().keys({
    userName: Joi.string(),
    sport: Joi.string(),
    dateFrom: Joi.date().iso().default(() => new Date().toISOString(), 'current time'),
    dateTo: Joi.date().iso(),
    lat: Joi.number().min(-90).max(90),
    long: Joi.number().min(-180).max(180),
    orderBy: Joi.string().valid('date', 'deadline', 'name', 'location', 'distance').default('date'),
    pageSize: Joi.number().min(1).max(100).default(10),
    page: Joi.number().min(1).default(1)
}).with('lat', 'long').options({ stripUnknown: true });

const eventApplySchema = Joi.object().keys({
    eventID: Joi.number().required(),
    teamName: Joi.string().min(5).max(25).required(),
    members: Joi.array().items(Joi.string()).min(1).required()
}).options({ stripUnknown: true });
