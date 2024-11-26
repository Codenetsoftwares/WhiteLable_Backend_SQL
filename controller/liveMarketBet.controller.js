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

    // Fetch live games data
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
        
    const lotteryResponse = await axios.get(
      `http://localhost:8080/api/get-live-markets`
    );

    const lotteryData =
      lotteryResponse.data?.data && lotteryResponse.data.data.length > 0
        ? lotteryResponse.data.data[0]
        : null;

    const liveGames = response.data.data || [];

    const combinedData = lotteryData
      ? [
          {
            marketId: lotteryData.marketId,
            marketName: lotteryData.marketName,
            gameName: lotteryData.gameName,
          },
          ...liveGames,
        ]
      : liveGames;

    return res
      .status(statusCode.success)
      .send(
        apiResponseSuccess(combinedData, true, statusCode.success, "Success")
      );
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


export const getLiveUserBetMarket = async (req, res) => {
  try {
    const { marketId } = req.params;
    const loggedInAdminId = req.user.adminId; // Logged-in user's adminId
    const token = jwt.sign(
      { roles: req.user.roles },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Fetch data from external API
    const response = await axios.get(
      `http://localhost:7000/api/users-liveBet/${marketId}`,
      {
        params: { marketId },
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
    console.log("Testing.....", data);

    // Fetch user details from the database
    const userDetails = await admins.findAll({
      where: {
        userName: data.usersDetails.map((user) => user.userName),
        createdById: loggedInAdminId, // Filter by logged-in admin
      },
      attributes: ["userName", "createdById", "createdByUser"],
    });

    // Prepare the response
    const users = data.usersDetails
      .filter((user) =>
        userDetails.some((detail) => detail.userName === user.userName)
      )
      .map((user) => ({
        userName: user.userName,
        userId: user.userId,
        marketId: user.marketId,
        runnerBalance: user.runnerBalance, // Include back and lay details
      }));

    res
      .status(statusCode.success)
      .send(apiResponseSuccess(users, true, statusCode.success, "Success"));
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

