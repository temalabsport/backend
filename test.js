const assert = require('assert');

const passwordHash = require('./utils/passwordHash');

describe('Password Hashing', function () {
    it('Hashing and checking password', function () {
        const passwordString = [...Array(16)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
        const passwordData = passwordHash.generateNew(passwordString);
        assert.strictEqual(passwordHash.validate(passwordString, passwordData.passwordSalt, passwordData.passwordHash), true);
    });

    it('Validating bad password', function () {
        const passwordString = 'aaaaa';
        const badPasswordString = 'bbbbbbbb';
        const passwordData = passwordHash.generateNew(passwordString);
        assert.strictEqual(passwordHash.validate(badPasswordString, passwordData.passwordSalt, passwordData.passwordHash), false);
    });

    it('Same password different hash', function () {
        const passwordString = 'testpass';
        const passwordData1 = passwordHash.generateNew(passwordString);
        const passwordData2 = passwordHash.generateNew(passwordString);
        assert.strictEqual(passwordData1.passwordHash.equals(passwordData2.passwordHash), false);
    });

    it('Different password salt generated', function () {
        const passwordString = 'testpass';
        const passwordData1 = passwordHash.generateNew(passwordString);
        const passwordData2 = passwordHash.generateNew(passwordString);
        assert.strictEqual(passwordData1.passwordSalt.equals(passwordData2.passwordSalt), false);
    })
});