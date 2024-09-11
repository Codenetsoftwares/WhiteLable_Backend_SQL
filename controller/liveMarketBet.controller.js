import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { statusCode } from '../helper/statusCodes.js';
import axios from 'axios';

export const getUserBetMarket = async (req, res) => {
    try {
        const { marketId, userId } = req.params;

        if (!marketId) {
            return res
                .status(statusCode.badRequest)
                .send(apiResponseErr(null, statusCode.badRequest, false, 'Market ID is required'));
        }

        const params = {
            userId,
            marketId
        };

        const response = await axios.get(`http://localhost:7000/api/user-external-liveBet/${userId}/${marketId}`, {
            params,
        });
        if (!response.data.success) {
            return res
                .status(statusCode.badRequest)
                .send(apiResponseErr(null, false, statusCode.badRequest, 'Failed to fetch data'));
        }

        const { data } = response.data;

        res.status(statusCode.success).send(apiResponseSuccess(
            data,
            true,
            statusCode.success,
            'Success',
        ));
    } catch (error) {
        console.error("Error from API:", error.response ? error.response.data : error.message);
        res.status(statusCode.internalServerError).send(apiResponseErr(null, false, statusCode.internalServerError, error.message));
    }
};

