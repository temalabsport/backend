const ipLocator = require('../utils/ipLocator');

module.exports = async (req, res, next) => {
    req.location = await ipLocator(req.ip);
    next();
}