import { getUserBetMarket } from "../controller/liveMarketBet.controller.js";

export const liveMarketBetRoute = (app) => {
    app.get(
        '/api/get-userBetMarket/:userId/:marketId',
        getUserBetMarket,
      );
}