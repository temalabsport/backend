const user = require('./routes/user');

const pool = require('./utils/sqlConnectionPool');

const config = require('config');
const express = require('express');
const app = express();

pool.init();

app.use(express.json());

app.use('/api/user', user);

const port = config.get('port');
app.listen(port, () => {
    console.log(`Server listening on port ${port}...`);
});
