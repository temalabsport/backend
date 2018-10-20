const crypto = require('crypto');

const HASH_ALGORITHM = 'sha512';
const SALT_SIZE = 16;

function sha512(passwordBuffer, saltBuffer) {
    const hash = crypto.createHmac(HASH_ALGORITHM, saltBuffer);
    hash.update(passwordBuffer);
    return hash.digest();
};

module.exports.generateNew = function (passwordString) {
    const passwordBuffer = Buffer.from(passwordString);
    var saltBuffer = crypto.randomBytes(SALT_SIZE);
    var hashBuffer = sha512(passwordBuffer, saltBuffer);
    return {
        passwordSalt: saltBuffer,
        passwordHash: hashBuffer
    };
};

module.exports.validate = function (passwordString, saltStringHex, hashStringHex) {
    const passwordBuffer = Buffer.from(passwordString);
    const saltBuffer = Buffer.from(saltStringHex, 'hex');
    const hashBuffer = Buffer.from(hashStringHex, 'hex');
    const passwordHash = sha512(passwordBuffer, saltBuffer);
    return Buffer.compare(passwordHash, hashBuffer) === 0;
}