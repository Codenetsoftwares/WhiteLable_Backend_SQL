import axios from "axios";
import { apiResponseErr, apiResponseSuccess } from "../helper/errorHandler.js";
import { statusCode } from "../helper/statusCodes.js";

export const getLotteryBetHistory = async (req, res) => {
  try {
    const { userName } = req.params;
    const baseURL = process.env.LOTTERY_URL;
    const { startDate, endDate, page = 1, limit = 10, dataType } = req.query;
    console.log(
      "userName dataType, startDate endDate ",
      userName,
      dataType,
      startDate,
      endDate
    );

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
};
