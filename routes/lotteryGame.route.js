import { getLotteryBetHistory } from "../controller/lotteryGame.controller.js";

export const lotteryGameModule = (app) => {
    app.post('/api/get-lottery-bet-history/:userName', getLotteryBetHistory);
}