const user = require('./routes/user');

const config = require('config');
const express = require('express');
const app = express();

app.use(express.json());

app.use('/user', user);

const port = config.get('port');
app.listen(port, () => {
    console.log(`Server listening on port ${port}...`);
});
