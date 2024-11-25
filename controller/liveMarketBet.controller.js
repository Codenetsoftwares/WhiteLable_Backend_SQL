import { apiResponseErr, apiResponseSuccess } from "../helper/errorHandler.js";
import { statusCode } from "../helper/statusCodes.js";
import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import admins from "../models/admin.model.js";
dotenv.config();

export const getUserBetMarket = async (req, res) => {
  try {
    const { marketId } = req.params;

    if (!marketId) {
      return res
        .status(statusCode.badRequest)
        .send(
          apiResponseErr(
            null,
            statusCode.badRequest,
            false,
            "Market ID is required"
          )
        );
    }
    const token = jwt.sign(
      { roles: req.user.roles },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );
    const params = {
      marketId,
    };

    const response = await axios.get(
      `http://localhost:7000/api/user-external-liveBet/${marketId}`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
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

    res
      .status(statusCode.success)
      .send(apiResponseSuccess(data, true, statusCode.success, "Success"));
  } catch (error) {
    res
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

export const getLiveBetGames = async (req, res) => {
  try {
    const token = jwt.sign(
      { roles: req.user.roles },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    const response = await axios.get(
      `http://localhost:7000/api/user-external-liveGamesBet`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
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

    res
      .status(statusCode.success)
      .send(apiResponseSuccess(data, true, statusCode.success, "Success"));
  } catch (error) {
    console.error(
      "Error from API:",
      error.response ? error.response.data : error.message
    );
    res
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

export const getLiveUserBet = async (req, res) => {
  try {
    const { marketId } = req.params;

    // Fetch data from external API
    const response = await axios.get(
      `http://localhost:7000/api/users-liveBet/${marketId}`
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

    const userDetails = await admins.findAll({
      where: { userName: data.usersDetails.map((user) => user.userName) },
      attributes: ["userName", "createdById", "createdByUser"],
    });

    const buildHierarchy = async (createdById) => {
      const hierarchy = [];
      while (createdById) {
        const admin = await admins.findOne({
          where: { adminId: createdById },
          attributes: ["adminId", "userName", "createdById", "createdByUser"],
        });
        if (!admin) break;

        hierarchy.unshift({
          adminId: admin.adminId,
          userName: admin.userName,
        //   createdById: admin.createdById,
        //   createdByUser: admin.createdByUser,
        });

        createdById = admin.createdById;
      }
      return hierarchy;
    };

    const usersByCreator = {};
    for (const userDetail of data.usersDetails) {
      const userInfo = userDetails.find(
        (admin) => admin.userName === userDetail.userName
      );

      const createdById = userInfo?.createdById || "No Creator";
      const createdByHierarchy = userInfo?.createdById
        ? await buildHierarchy(userInfo.createdById)
        : [];

      if (!usersByCreator[createdById]) {
        usersByCreator[createdById] = {
          createdByHierarchy,
          users: [],
        };
      }

      usersByCreator[createdById].users.push({
        userName: userDetail.userName,
        userId: userDetail.userId,
        marketId: userDetail.marketId,
        runnerBalance: userDetail.runnerBalance,
      });
    }

    const finalData = Object.entries(usersByCreator).map(([_, group]) => ({
      createdByHierarchy: group.createdByHierarchy,
      users: group.users,
    }));

    res
      .status(statusCode.success)
      .send(apiResponseSuccess(finalData, true, statusCode.success, "Success"));
  } catch (error) {
    console.error("Error from API:", error.response?.data || error.message);
    res
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
