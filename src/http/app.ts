import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from "express";
import helmet from "helmet";
const app = express();
app.use(helmet());
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true}));
app.use(cookieParser());
export default app;
