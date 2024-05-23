import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';

// Route Imports
import { AdminRoute } from './routes/admin.route.js';

dotenv.config();
const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = process.env.FRONTEND_URI.split(',');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Status : OK');
});

AdminRoute(app);

app.listen(process.env.PORT, () => {
  console.log(`App is running on  - http://localhost:${process.env.PORT || 8000}`);
});
