import { getLotteryBetHistory, lotteryMarketAnalysis } from "../controller/lotteryGame.controller.js";

export const lotteryGameModule = (app) => {
    app.post('/api/get-lottery-bet-history/:userName', getLotteryBetHistory);

    app.post('/api/get-lottery-marketAnalysis/:marketId', lotteryMarketAnalysis);
}