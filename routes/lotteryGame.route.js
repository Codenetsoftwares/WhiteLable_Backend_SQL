import { getBetHistoryP_L, getLotteryBetHistory, getLotteryP_L, lotteryMarketAnalysis } from "../controller/lotteryGame.controller.js";

export const lotteryGameModule = (app) => {
    app.post('/api/get-lottery-bet-history/:userName', getLotteryBetHistory);

    app.post('/api/get-lottery-marketAnalysis/:marketId', lotteryMarketAnalysis);

    app.get('/api/lottery-profit-loss/:userName', getLotteryP_L);

    app.get('/api/lottery-betHistory-profitLoss/:userName', getBetHistoryP_L);


}