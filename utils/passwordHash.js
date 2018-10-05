var crypto = require('crypto');

function genRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

function sha512(password, salt) {
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('hex');
};

module.exports.generateNew = function (password) {
    var salt = genRandomString(16);
    var value = sha512(password, salt);
    return {
        passwordSalt: salt,
        passwordHash: value
    };
};

module.exports.validate = function (password, salt, hash) {
    const passwordHash = sha512(password, salt);
    return passwordHash === hash;
}