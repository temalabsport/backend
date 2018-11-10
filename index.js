const user = require('./routes/user');
const sports = require('./routes/sports');
const event = require('./routes/event');

const pool = require('./utils/sqlConnectionPool');

const notifyUserTask = require('./scheduled-tasks/notifyUsers');

const morgan = require('morgan')
const config = require('config');
const cron = require('node-cron');
const express = require('express');
const app = express();

app.enable('trust proxy');

app.use(morgan('tiny'));
app.use(express.static('public'));
app.use(express.json());

app.use('/api/user', user);
app.use('/api/sports', sports);
app.use('/api/event', event);

const port = config.get('port');

pool.init().then(() => {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}...`);
        cron.schedule('0 0 10 * * *', notifyUserTask);
        console.log('Task scheuled');
    })
});
