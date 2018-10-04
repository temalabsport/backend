const Joi = require('joi');
const express = require('express');
const sql = require('mssql');

const router = express.Router();

module.exports = router;

router.post('/register', async (req, res) => {
    const result = Joi.validate(req.body, registerUserSchema);

    if(result.error){
        res.status(400).send(result.error.details[0].message);
        return;
    }

    res.send(result.value);
});

const registerUserSchema = Joi.object().keys({
    userName : Joi.string().min(5).max(20).required(),
    email : Joi.string().email().required(),
    password : Joi.string().min(8).required(),
    fullName : Joi.string().required()
}).options({ stripUnknown: true });