import { string } from "../constructor/string.js";
import { getBetHistoryP_L, getLotteryBetHistory, getLotteryP_L, lotteryMarketAnalysis } from "../controller/lotteryGame.controller.js";
import customErrorHandler from "../helper/customErrorHandler.js";
import { Authorize } from "../middleware/auth.js";
import { validateGetBetHistoryP_L, validateGetExternalLotteryP_L, validateGetLotteryBetHistory, validateLotteryMarketAnalysis } from "../schema/commonSchema.js";

export const lotteryGameModule = (app) => {
    app.post('/api/get-lottery-bet-history/:userName',validateGetLotteryBetHistory,customErrorHandler,Authorize([
        string.superAdmin,
        string.whiteLabel,
        string.hyperAgent,
        string.superAgent,
        string.masterAgent
      ]), getLotteryBetHistory);

    app.get('/api/get-lottery-marketAnalysis/:marketId',validateLotteryMarketAnalysis,customErrorHandler,Authorize([
        string.superAdmin,
        string.whiteLabel,
        string.hyperAgent,
        string.superAgent,
        string.masterAgent
      ]), lotteryMarketAnalysis);

    app.get('/api/lottery-profit-loss/:userName', validateGetExternalLotteryP_L, customErrorHandler,Authorize([
        string.superAdmin,
        string.whiteLabel,
        string.hyperAgent,
        string.superAgent,
        string.masterAgent
      ]), getLotteryP_L);

    app.get('/api/lottery-betHistory-profitLoss/:userName',validateGetBetHistoryP_L,customErrorHandler,Authorize([
        string.superAdmin,
        string.whiteLabel,
        string.hyperAgent,
        string.superAgent,
        string.masterAgent
      ]), getBetHistoryP_L);


}