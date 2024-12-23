import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import sequelize from './db.js';

import { adminRoute } from './routes/admin.route.js';
import { authRoute } from './routes/auth.route.js';
import { transactionRoute } from './routes/transaction.route.js';
import { trashRoute } from './routes/trash.route.js';
import { colorGameUserRoute } from './routes/colorGameUser.route.js';
import { liveMarketBetRoute } from './routes/liveMarketBet.route.js';
import { activeAdminRoute } from './routes/activeAdmin.route.js';
import { lotteryGameModule } from './routes/lotteryGame.route.js';

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

adminRoute(app);
authRoute(app);
transactionRoute(app);
trashRoute(app);
colorGameUserRoute(app);
liveMarketBetRoute(app);
activeAdminRoute(app);
lotteryGameModule(app);

sequelize.sync({ alter: false })
  .then(() => {
    console.log('Database & tables created!');
  })
  .catch(err => {
    console.error('Unable to create tables:', err);
  });

app.listen(process.env.PORT, () => {
  console.log(`App is running on  - http://localhost:${process.env.PORT || 8000}`);
});
