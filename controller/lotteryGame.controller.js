import axios from "axios";
import { apiResponseErr, apiResponseSuccess } from "../helper/errorHandler.js";
import { statusCode } from "../helper/statusCodes.js";

export const getLotteryBetHistory = async (req, res) => {
    try {
        const { userName } = req.params
        const baseURL = process.env.LOTTERY_URL;
        const response = await axios.post(`${baseURL}/api/lottery-external-bet-history`, { userName });

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