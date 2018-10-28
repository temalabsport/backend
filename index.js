const user = require('./routes/user');
const sports = require('./routes/sports');
const event = require('./routes/event');

const pool = require('./utils/sqlConnectionPool');

const morgan = require('morgan')
const config = require('config');
const express = require('express');
const app = express();

app.use(morgan('tiny'));
app.use(express.static('public'));
app.use(express.json());

app.use('/api/user', user);
app.use('/api/sports', sports);
app.use('/api/event', event);

const port = config.get('port');

pool.init().then(() => {
    app.listen(port, () =>
        console.log(`Server listening on port ${port}...`)
    )
});
