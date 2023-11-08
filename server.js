import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv"
import bodyParser from 'body-parser';
import { AdminRoute } from "./routes/admin.route.js";
import { HyperAgentRoute } from "./routes/hyperAgent.route.js";
import { MasterAgentRoute } from "./routes/masterAgent.route.js";
import { SubAdminRoute } from "./routes/subAdmin.route.js";
import { SuperAgentRoute } from "./routes/superAgent.route.js";
import { UserRoute } from "./routes/user.route.js";
import { WhiteLabelRoute } from "./routes/whitelabel.route.js";
import { SubHypergentRoute } from "./routes/subHyperAgent.route.js";
import cors from 'cors';


dotenv.config()

const app = express();

app.use(express.json());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ extended: true }));
const  allowedOrigins = process.env.FRONTEND_URI.split(",");
app.use(cors({ origin: allowedOrigins }));


mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_NAME });

AdminRoute(app);
WhiteLabelRoute(app);
HyperAgentRoute(app);
MasterAgentRoute(app);
SubAdminRoute(app);
SuperAgentRoute(app);
UserRoute(app);
SubHypergentRoute(app);

app.listen(process.env.PORT, ()=>{
    console.log(`App is running on  - http://localhost:${process.env.PORT || 8080}`)
})