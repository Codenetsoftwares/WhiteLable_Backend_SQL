import dotenv from "dotenv";
dotenv.config();

export const API_URL = () => {
  return process.env.NODE_ENV === "production"
    ? process.env.PRODUCTION_API_URL
    : process.env.API_URL;
};
