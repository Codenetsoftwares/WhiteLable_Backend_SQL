
import dotenv from "dotenv";
dotenv.config();

export const API_URL = () => { 
  if (process.env.NODE_ENV === "production") {
    return {
      whiteLabelUrl: process.env.WHITE_LABEL_URL ,
      lotteryUrl: process.env.LOTTERY_URL 
    };
  } else {
    return {
      whiteLabelUrl: process.env.DEV_WHITE_LABEL_URL || "http://localhost:8000",
      lotteryUrl: process.env.DEV_LOTTERY_URL || "http://localhost:8080",
      
    };
  }
};
