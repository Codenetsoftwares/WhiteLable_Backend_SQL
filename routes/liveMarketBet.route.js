import { string } from "../constructor/string.js";
import {
  getLiveBetGames,
  getLiveUserBet,
  getLiveUserBetMarket,
  getUserBetMarket,
} from "../controller/liveMarketBet.controller.js";
import { Authorize } from "../middleware/auth.js";

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
    // Authorize([
    //   string.superAdmin,
    //   string.whiteLabel,
    //   string.hyperAgent,
    //   string.superAgent,
    //   string.masterAgent,
    // ]),
    getLiveUserBet
  );

  app.get(
    "/api/get-live-users-marketUser/:marketId",
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
    ]),
    getLiveUserBetMarket
  );
};
