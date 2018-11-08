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
    const validateResult = Joi.validate(req.body, loginUserSchema);

    if (validateResult.error) {
        res.status(400).send('No or invalid credentials provided');
        return;
    }

    const params = validateResult.value;

    try {
        const request = pool.request();
        request.input('Email', params.email);
        const result = await request.query(
            `SELECT UserName, PasswordHash, PasswordSalt, FullName, Role FROM Users WHERE Email = @Email`
        );
        if (result.recordset.length !== 1) {
            res.status(400).send('No or invalid credentials provided');
            return;
        } else {
            const userData = result.recordset[0];
            const passwordSalt = userData.PasswordSalt;
            const passwordHash = userData.PasswordHash;
            let isAdmin = false;
            if(userData.Role !== null){
                isAdmin = userData.Role.split(",").includes("admin");
            }
            if (hash.validate(params.password, passwordSalt, passwordHash)) {
                const responseBody = {
                    userName: userData.UserName,
                    fullName: userData.FullName,
                    isAdmin: isAdmin === true
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

router.put('/update', auth, async (req, res) => {
    const validateResult = Joi.validate(req.body, updateUserSchema);
    if (validateResult.error) {
        res.status(400).send(validateResult.error.details[0].message);
        return;
    }
    const params = validateResult.value;

    try {
        const userRequest = pool.request();
        userRequest.input('UserName', req.user.userName);
        const userResult = await userRequest.query(
            `SELECT PasswordHash, PasswordSalt FROM Users WHERE UserName = @UserName`
        );
        if (userResult.recordset.length !== 1) {
            res.status(400).send('Invalid Token');
            return;
        } else {
            const userData = userResult.recordset[0];
            const passwordSalt = userData.PasswordSalt;
            const passwordHash = userData.PasswordHash;
            if (hash.validate(params.currentPassword, passwordSalt, passwordHash)) {
                let newPasswordSalt = undefined;
                let newPasswordHash = undefined;

                if(params.newPassword !== undefined){
                    const newPasswordData = hash.generateNew(params.newPassword);
                    newPasswordSalt = newPasswordData.passwordSalt;
                    newPasswordHash = newPasswordData.passwordHash;
                }

                const updateRequest = pool.request();
                updateRequest.input('UserName', req.user.userName)
                updateRequest.input('NewFullName', params.newFullName);
                updateRequest.input('NewIntroduction', params.newIntroduction);
                updateRequest.input('NewPasswordSalt', sql.Binary, newPasswordSalt);
                updateRequest.input('NewPasswordHash', sql.Binary, newPasswordHash);
                await updateRequest.query(
                    `UPDATE Users SET 
                    FullName = COALESCE( @NewFullName, FullName ), 
                    Introduction = COALESCE( @NewIntroduction, Introduction ), 
                    PasswordSalt = COALESCE( @NewPasswordSalt, PasswordSalt ),
                    PasswordHash = COALESCE( @NewPasswordHash, PasswordHash)
                    WHERE UserName = @UserName`
                );

                res.status(201).send('Successfully updated');
                return;
            } else {
                res.status(400).send('Invalid currentPassword provided');
                return;
            }
        }
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

router.get('/search', auth, async (req, res) => {
    const validateResult = Joi.validate(req.query, searchQueryParamsSchema);
    if (validateResult.error) {
        res.status(400).send(validateResult.error.details[0].message);
        return;
    }
    const params = validateResult.value;
    try {
        const searchRequest = pool.request();
        searchRequest.input('KeyWord', params.q);
        searchRequest.input('OrderBy', params.orderBy);
        searchRequest.input('PageSize', params.pageSize);
        searchRequest.input('Page', params.page);
        searchRequest.output('TotalResults');
        searchRequest.output('TotalPages');
        const searchResult = await searchRequest.execute('SearchUsers');

        const ret = {
            results: searchResult.recordset,
            totalResults: searchResult.output.TotalResults,
            totalPages: searchResult.output.TotalPages
        }
        res.send(ret);
        return;
    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

router.get('/findByUserName/:userName', auth, async (req, res) => {
    const validateResult = Joi.validate(req.params.userName, Joi.string());
    if (validateResult.error) {
        res.status(400).send(validateResult.error.details[0].message);
        return;
    }

    const userName = validateResult.value;

    try {
        const userRequest = pool.request();
        userRequest.input('UserName', userName);
        const userResult = await userRequest.query(
            `SELECT Users.UserName AS userName, Users.FullName AS fullName, Users.Introduction AS introduction FROM Users WHERE Users.UserName = @UserName`
        );

        console.log(userRequest);

        if (userResult.recordset.length !== 1) {
            res.status(400).send('User with given userName does not exist');
            return;
        } else {
            res.send(userResult.recordset[0]);
            return;
        }

    } catch (error) {
        res.status(500).send('Server error');
        console.log('DATABASE ERROR : ', error);
        return;
    }
});

const registerUserSchema = Joi.object().keys({
    userName: Joi.string().min(5).max(20).required(),
    email: Joi.string().max(255).email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().required()
}).options({ stripUnknown: true });

const loginUserSchema = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required()
}).options({ stripUnknown: true });

const updateUserSchema = Joi.object().keys({
    newFullName: Joi.string(),
    newIntroduction: Joi.string(),
    newPassword: Joi.string().min(8),
    currentPassword: Joi.string().required()
}).or('newFullName', 'newIntroduction', 'newPassword').options({ stripUnknown: true });

const searchQueryParamsSchema = Joi.object().keys({
    q: Joi.string(),
    orderBy: Joi.string().valid('userName', 'fullName').default('userName'),
    pageSize: Joi.number().min(1).max(100).default(10),
    page: Joi.number().min(1).default(1)
}).options({ stripUnknown: true });