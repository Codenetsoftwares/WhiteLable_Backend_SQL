import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { statusCode } from '../helper/statusCodes.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const getUserBetMarket = async (req, res) => {
    try {
        const { marketId } = req.params;

        if (!marketId) {
            return res
                .status(statusCode.badRequest)
                .send(apiResponseErr(null, statusCode.badRequest, false, 'Market ID is required'));
        }
        const token = jwt.sign({ roles: req.user.roles }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
        const params = {
            marketId
        };

        const response = await axios.get(`http://localhost:7000/api/user-external-liveBet/${marketId}`, {
            params,
            headers: {
                Authorization: `Bearer ${token}`,
            },
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

export const getLiveBetGames = async (req, res) => {
    try {
        const token = jwt.sign({ roles: req.user.roles }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

        const response = await axios.get(`http://localhost:7000/api/user-external-liveGamesBet`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
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