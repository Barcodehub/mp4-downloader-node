const express = require('express');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./utils/errorHandler');

const app = express();

app.use(express.json());


app.use('/api', routes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});