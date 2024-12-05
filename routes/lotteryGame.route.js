import { getBetHistoryP_L, getLotteryBetHistory, getLotteryP_L, lotteryMarketAnalysis } from "../controller/lotteryGame.controller.js";
import customErrorHandler from "../helper/customErrorHandler.js";
import { validateGetExternalLotteryP_L } from "../schema/commonSchema.js";

export const lotteryGameModule = (app) => {
    app.post('/api/get-lottery-bet-history/:userName', getLotteryBetHistory);

    app.get('/api/get-lottery-marketAnalysis/:marketId', lotteryMarketAnalysis);

    app.get('/api/lottery-profit-loss/:userName', validateGetExternalLotteryP_L, customErrorHandler, getLotteryP_L);

    app.get('/api/lottery-betHistory-profitLoss/:userName', getBetHistoryP_L);


}