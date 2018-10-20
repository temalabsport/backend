const pool = require('../utils/sqlConnectionPool').pool;
const hash = require('../utils/passwordHash');

const auth = require('../middleware/auth');

const Joi = require('joi');
const express = require('express');
const config = require('config');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

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
        const checkRequest = pool.request();
        checkRequest.input('EMAIL', user.email);
        checkRequest.input('USERNAME', user.userName);

        let checkResult = await checkRequest.query(
            `SELECT ID FROM Users WHERE Email = @EMAIL OR UserName = @USERNAME`
        );

        if (checkResult.recordset.length !== 0) {
            res.status(409).send('User is already registered');
            return;
        }

        const passwordData = hash.generateNew(user.password);

        const insertRequest = pool.request();
        insertRequest.input('USERNAME', user.userName);
        insertRequest.input('EMAIL', user.email);
        insertRequest.input('HASH', passwordData.passwordHash);
        insertRequest.input('SALT', passwordData.passwordSalt);
        insertRequest.input('FULLNAME', user.fullName);

        await insertRequest.query(
            `INSERT INTO Users (UserName, Email, PasswordHash, PasswordSalt, FullName) VALUES (@USERNAME, @EMAIL, @HASH, @SALT, @FULLNAME)`
        );

        res.status(201).send('User registered successfuly');
        return;
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

router.post('/login', async (req, res) => {
    const result = Joi.validate(req.body, loginUserSchema);

    if (result.error) {
        res.status(400).send('No or invalid credentials provided');
        return;
    }

    const params = result.value;

    try {
        const request = pool.request();
        request.input('EMAIL', params.email);
        const result = await request.query(
            `SELECT UserName, Email, PasswordHash, PasswordSalt, FullName FROM Users WHERE Email = @EMAIL`
        );
        if (result.recordset.length !== 1) {
            res.status(400).send('No or invalid credentials provided');
            return;
        } else {
            const userData = result.recordset[0];
            const passwordSalt = userData.PasswordSalt.toString('hex');
            const passwordHash = userData.PasswordHash.toString('hex');
            if (hash.validate(params.password, passwordSalt, passwordHash)) {
                const responseBody = {
                    userName: userData.UserName,
                    email: userData.Email,
                    fullName: userData.FullName
                };

                const token = jwt.sign(responseBody, config.get('jwtSecret'));

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

router.get('/me', auth, (req, res) => {
    res.send(req.user);
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