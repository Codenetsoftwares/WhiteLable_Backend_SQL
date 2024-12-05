import axios from "axios";
import { apiResponseErr, apiResponseSuccess } from "../helper/errorHandler.js";
import { statusCode } from "../helper/statusCodes.js";

export const getLotteryBetHistory = async (req, res) => {
  try {
    const { userName } = req.params;
    const baseURL = process.env.LOTTERY_URL;
    const { startDate, endDate, page = 1, limit = 10, dataType } = req.query;
    const params = {
      dataType,
      startDate,
      endDate,
      page,
      limit,
    };
    console.log("params", params);
    const response = await axios.post(
      `${baseURL}/api/lottery-external-bet-history`,
      { userName },
      { params }
    );
    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .send(
          apiResponseErr(
            null,
            false,
            statusCode.badRequest,
            "Failed to fetch data"
          )
        );
    }
    const { data, pagination } = response.data;

    return res
      .status(statusCode.success)
      .send(
        apiResponseSuccess(
          data,
          true,
          statusCode.success,
          "Success",
          pagination
        )
      );
  } catch (error) {
    console.error("Error:", error);

    return res
      .status(statusCode.internalServerError)
      .send(
        apiResponseErr(
          null,
          false,
          statusCode.internalServerError,
          error.message
        )
      );
  }
}

export const lotteryMarketAnalysis = async (req, res) => {
  try {
    const { marketId } = req.params
    const baseURL = process.env.LOTTERY_URL;
    const response = await axios.get(`${baseURL}/api/lottery-external-marketAnalysis/${marketId}`);

    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .send(
          apiResponseErr(
            null,
            false,
            statusCode.badRequest,
            "Failed to fetch data"
          )
        );
    }

    return res.status(statusCode.success).send(apiResponseSuccess(response.data.data, true, statusCode.success, 'Success'));
  } catch (error) {
    console.error('Error:', error);

    return res.status(statusCode.internalServerError).send(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
}

export const getLotteryP_L = async (req, res) => {
  try {
    const { userName } = req.params
        const { page = 1, limit = 10 } = req.query;
        const params = {
          page,
          limit,
        };
    const baseURL = process.env.COLOR_GAME_URL;

    const response = await axios.get(`${baseURL}/api/external-lottery-profit-loss/${userName}`,
          { params }
        );

    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .send(
          apiResponseErr(
            null,
            false,
            statusCode.badRequest,
            "Failed to fetch data"
          )
        );
    }
        const { data, pagination } = response.data;
        
    return res.status(statusCode.success).send(apiResponseSuccess(data, true, statusCode.success, 'Success',pagination));
  } catch (error) {
      console.log("error......", error)
    return res.status(statusCode.internalServerError).send(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

export const getBetHistoryP_L = async (req, res) => {
  try {
    const { userName } = req.params;
    const baseURL = process.env.LOTTERY_URL;

    const response = await axios.post(
      `${baseURL}/api/lottery-external-betHistory-profitLoss`, { userName }
    );
    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .send(
          apiResponseErr(
            null,
            false,
            statusCode.badRequest,
            "Failed to fetch data"
          )
        );
    }
    const { data } = response.data;

    return res.status(statusCode.success).send(apiResponseSuccess(data, true, statusCode.success, "Success"));

  } catch (error) {
    console.error("Error:", error);

    return res.status(statusCode.internalServerError).send(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
}
