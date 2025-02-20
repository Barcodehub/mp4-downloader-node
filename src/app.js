const express = require('express');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./utils/errorHandler');
const cors = require('cors');
const app = express();



app.use(cors({
   origin: 'http://localhost:3000', // URL de frontend
   methods: ['GET', 'POST'],
   allowedHeaders: ['Content-Type', 'Authorization']
 }));

app.use(express.json());

app.use('/api', routes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});