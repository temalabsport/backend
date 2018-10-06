const pool = require('../utils/sqlConnectionPool').pool;
const hash = require('../utils/passwordHash');

const Joi = require('joi');
const express = require('express');
const config = require('config');
const jwt = require('jsonwebtoken');

const router = express.Router();

module.exports = router;

router.post('/register', async (req, res) => {
    const result = Joi.validate(req.body, registerUserSchema);

    if (result.error) {
        res.status(400).send(result.error.details[0].message);
        return;
    }
    const user = result.value;

    try {
        let result = await pool.request().query(
            `SELECT ID FROM Users WHERE Email = '${user.email}' OR UserName = '${user.userName}'`
        );
        if (result.recordset.length !== 0) {
            res.status(409).send('User is already registered');
            return;
        }

        const passwordData = hash.generateNew(user.password);
        result = await pool.request().query(
            `INSERT INTO Users (UserName, Email, PasswordHash, PasswordSalt, FullName) VALUES ('${user.userName}', '${user.email}', 0x${passwordData.passwordHash}, 0x${passwordData.passwordSalt}, '${user.fullName}')`
        );
    } catch (err) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', err);
        return;
    }

    res.status(201).send('User registered successfuly');
});

router.post('/login', async (req, res) => {
    const result = Joi.validate(req.body, loginUserSchema);

    if (result.error) {
        res.status(400).send('No or invalid credentials provided');
        return;
    }

    const parameters = result.value;

    try {
        let result = await pool.request().query(
            `SELECT ID, UserName, Email, PasswordHash, PasswordSalt, FullName FROM Users WHERE Email = '${parameters.email}'`
        );
        if (result.recordset.length !== 1) {
            res.status(400).send('No or invalid credentials provided');
            return;
        } else {
            const userData = result.recordset[0];
            const passwordSalt = userData.PasswordSalt.toString('hex');
            const passwordHash = userData.PasswordHash.toString('hex');
            if (hash.validate(parameters.password, passwordSalt, passwordHash)) {
                
                const responseBody = {
                    id : userData.ID,
                    userName : userData.UserName,
                    email : userData.Email,
                    fullName : userData.FullName
                };

                const token = jwt.sign(responseBody, config.get('jwtSecret'));
                responseBody.token = token;

                res.header('x-auth-token', token).send(responseBody);
                return;
            } else {
                res.status(400).send('No or invalid credentials provided');
                return;
            }
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('Server error');
        return;
    }
});

const registerUserSchema = Joi.object().keys({
    userName: Joi.string().min(5).max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().required()
}).options({ stripUnknown: true });

const loginUserSchema = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required()
}).options({ stripUnknown: true });