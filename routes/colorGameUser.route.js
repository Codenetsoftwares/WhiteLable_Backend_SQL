import { Authorize } from '../middleware/auth.js';
import customErrorHandler from '../helper/customErrorHandler.js';
import { betHistorySchema, calculateProfitLossSchema, createdUserSchema, marketProfitLossSchema, runnerProfitLossSchema, sendBalanceSchema } from '../schema/commonSchema.js';
import { userCreateColorGame, viewColorGameUser, addBalanceToColorGameUser, userGame, getUserBetHistory, getColorGameProfitLoss, marketProfitLoss, runnerProfitLoss } from '../controller/colorGameUser.controller.js';
import { string } from '../constructor/string.js';


export const colorGameUserRoute = (app) => {

  app.post('/api/admin/create-user-colorGame', createdUserSchema, customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent
    ]), userCreateColorGame);

  app.get('/api/admin/view-colorGame-user', customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent
    ]), viewColorGameUser)

  app.post('/api/admin/add-balance-to-colorGame-user', sendBalanceSchema, customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent
    ]), addBalanceToColorGameUser)

  app.get('/api/user-colorGame-games', userGame);

  app.get('/api/user-colorGame-betHistory/:userName/:gameId', betHistorySchema, getUserBetHistory);

  app.get('/api/user-colorGame-profitLoss/:userName', calculateProfitLossSchema, customErrorHandler, getColorGameProfitLoss);

  app.get('/api/user-colorGame-market_profitLoss/:userName/:gameId', marketProfitLossSchema, customErrorHandler, marketProfitLoss);

  app.get('/api/user-colorGame-runner_profitLoss/:userName/:marketId', runnerProfitLossSchema, customErrorHandler, runnerProfitLoss);

}