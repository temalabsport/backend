const config = require('config');
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) {
        res.status(401).send('No token provided');
        return;
    }
    try {
        const decoded = jwt.verify(token, config.get('jwtSecret'));
        req.user = decoded;
        next();
    }
    catch (ex) {
        res.status(400).send('Invalid token.');
    }
}