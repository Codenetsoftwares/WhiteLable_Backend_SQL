import { string } from "../constructor/string.js";
import {
  getLiveBetGames,
  getLiveUserBet,
  getLiveUserBetMarket,
  getUserBetMarket,
  getUserMasterBook,
} from "../controller/liveMarketBet.controller.js";
import customErrorHandler from "../helper/customErrorHandler.js";
import { Authorize } from "../middleware/auth.js";
import { validateGetLiveUserBetMarket } from "../schema/commonSchema.js";

export const liveMarketBetRoute = (app) => {
  app.get(
    "/api/get-userBetMarket/:marketId",
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
    ]),
    getUserBetMarket
  );

  app.get(
    "/api/get-live-betGames",
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
    ]),
    getLiveBetGames
  );

  app.get(
    "/api/get-live-users/:marketId",
    validateGetLiveUserBetMarket,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
    ]),
    getLiveUserBet
  );

  app.get(
    "/api/get-live-users-marketUser/:marketId",
    validateGetLiveUserBetMarket,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
    ]),
    getLiveUserBetMarket
  );

  app.post(
    "/api/get-user-master-book",
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
    ]),
    getUserMasterBook
  );
};
