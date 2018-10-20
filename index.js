const user = require('./routes/user');
const sports = require('./routes/sports');
const events = require('./routes/events');

const pool = require('./utils/sqlConnectionPool');

const config = require('config');
const express = require('express');
const app = express();

app.use(express.json());

app.use('/api/user', user);
app.use('/api/sports', sports);
app.use('/api/events',events);

const port = config.get('port');

pool.init().then(() => {
app.listen(port, () =>
    console.log(`Server listening on port ${port}...`)
)});
