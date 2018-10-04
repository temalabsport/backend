const Joi = require('joi');
const express = require('express');

const router = express.Router();

module.exports = router;

router.post('/register', (req, res) => {
    const result = Joi.validate(req.body, registerUserSchema);
    res.send(result);
});

const registerUserSchema = Joi.object().keys({
    userName : Joi.string().min(5).max(20).required(),
    email : Joi.string().email().required(),
    password : Joi.string().min(8).required(),
    fullName : Joi.string().required()
});