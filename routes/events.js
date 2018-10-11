//const pool = require('../utils/sqlConnectionPool').pool;
const Joi = require('joi');
const config = require('config');
const sql = require('mssql');


const auth = require('../middleware/auth');

const express = require('express');

const router = express.Router();

module.exports = router;

router.get('/', auth, async (req, res) => {
    /*let result = Joi.validate(req.body, NewEventsSchema);
    if (result.error) {
        res.status(400).send(result.error.details[0].message);
        return;
    }

    const param = result.value
*/

//var password = req.param.userpassword;
    sql.connect(config.get('sqlConnString'), function (err) {
        if (err) console.log(err);
        // create Request object
        var request = new sql.Request();
        console.log(req,query)
        // query to the database and execute procedure 
        let query = "GetEvents @SPORTNAME='" + "Foci"+ "';";
        console.log(query)
        request.query(query, function (err, recordset) {
            if (err) {
                console.log(err);
                sql.close();
            }
            sql.close();
            res.send(recordset);
    
        });
      });
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
});

