import colorGameUserSchema from '../models/colorGameUser.model.js';
import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { statusCode } from '../helper/statusCodes.js';
import axios from 'axios';
import { v4 as uuid4 } from 'uuid';
import bcrypt from 'bcrypt';
import Sequelize from '../db.js';
import admins from '../models/admin.model.js';
import colorGameTransactionRecord from '../models/colorGameTransactions.model.js'
import moment from 'moment';

export const userCreateColorGame = async (req, res) => {
  try {
    const user = req.user;

    const { userName, password } = req.body;

    const existingUser = await colorGameUserSchema.findOne({ where: { userName } });

    if (existingUser) {
      return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, 'User already exists'));
    }

    const userId = uuid4();
    const walletId = uuid4();
    const adminId = uuid4();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await colorGameUserSchema.create({
      adminId,
      userName,
      userId,
      walletId,
      password: hashedPassword,
      roles: 'user',
      createdById: user.adminId,
      createdByUser: user.userName,
    });

    const newAdminUser = await admins.create({
      adminId: newUser.adminId,
      createdById: user.adminId,
      createdByUser: user.userName,
      userName,
      userId: newUser.userId,
      walletId: newUser.walletId,
      password: newUser.password,
      roles: [
        {
          role: 'user',
          permission: ['all-access']
        }
      ]
    });

    const data = {
      adminId: newAdminUser.adminId,
      userName,
      userId: newUser.userId,
      walletId: newUser.walletId,
      password: newUser.password,
      roles: 'user',
      createdById: user.adminId,
      createdByUser: user.userName,
    };

    const createUserResponse = await axios.post('http://localhost:8080/api/user-create', data);

    if (createUserResponse.status !== statusCode.create) {
      return res.status(statusCode.internalServerError).send(apiResponseErr(null, false, statusCode.internalServerError, 'Failed to create user in external backend'));
    }

    return res.status(statusCode.create).send(apiResponseSuccess(null, true, statusCode.create, 'User created successfully'));

  } catch (error) {
    console.error('Error:', error);
    res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

export const viewColorGameUser = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
    const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';

    const externalApiResponse = await axios.get("http://localhost:8080/api/all-user");

    if (!externalApiResponse || !externalApiResponse.data.data) {
      return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, 'Failed to fetch external data'));
    }

    const externalData = externalApiResponse.data.data;

    const localData = await colorGameUserSchema.findAll();

    const localUserIds = localData.map(item => item.userId);

    const matchedData = externalData.filter(externalItem => localUserIds.includes(externalItem.userId));

    const filteredData = matchedData.filter(item =>
      item.userName.toLowerCase().includes(searchQuery)
    );

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (page - 1) * pageSize;

    const paginatedData = filteredData.slice(offset, offset + pageSize);

    if (!paginatedData || paginatedData.length === 0) {
      throw new Error('Users not found');
    }

    const paginationData = {
      page,
      totalPages,
      totalItems,
    };

    return res.status(statusCode.success).json(apiResponseSuccess(paginatedData, true, statusCode.success, 'success', paginationData));
  } catch (error) {
    console.error('Error:', error);
    res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

export const addBalanceToColorGameUser = async (req, res) => {
  try {
    const { balance, adminId, userId } = req.body;

    // Check if admin exists
    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Admin Not Found'));
    }

    // Fetch external user data
    let externalApiResponse;
    try {
      externalApiResponse = await axios.get("http://localhost:8080/api/all-user");
    } catch (err) {
      console.error('Failed to fetch external data:', err);
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Failed to fetch external data'));
    }
    const externalData = externalApiResponse.data.data;

    // Fetch local user data
    const localData = await colorGameUserSchema.findAll();
    const localUserIds = localData.map(item => item.userId);

    // Find matching data between external and local
    const matchedData = externalData.filter(externalItem => localUserIds.includes(externalItem.userId));
    if (matchedData.length === 0) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'No matching users found'));
    }

    // Validate and parse deposit amount
    const parsedDepositAmount = parseFloat(balance);
    if (isNaN(parsedDepositAmount) || parsedDepositAmount <= 0) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Invalid or non-positive Balance'));
    }

    // Check if admin has sufficient balance
    if (admin.balance < parsedDepositAmount) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Insufficient Balance For Transfer'));
    }

    // Use Sequelize transaction to ensure atomicity
    await Sequelize.transaction(async (t) => {
      // Deduct balance from admin
      await admins.update(
        { balance: Sequelize.literal(`balance - ${parsedDepositAmount}`) },
        { where: { adminId }, transaction: t }
      );

      // Update balances for matched users in local database
      for (const user of matchedData) {
        await colorGameUserSchema.update(
          { balance: Sequelize.literal(`balance + ${parsedDepositAmount}`) },
          { where: { userId: user.userId }, transaction: t }
        );

        // Create transaction record in your local database
        await colorGameTransactionRecord.create(
          {
            userId: user.userId,
            transactionType: 'credit',
            amount: parsedDepositAmount,
            date: new Date(), // Use new Date() to get current date/time
          },
          { transaction: t }
        );

        // Send balance update to external API (assuming this is necessary)
        try {
          await axios.post("http://localhost:8080/api/sendBalance-user", {
            userId: user.userId,
            balance: user.balance + parsedDepositAmount,
          });
        } catch (err) {
          console.error('Failed to send balance update to external API:', err);
          // Handle failure to send balance update if necessary
        }
      }
    });

    // Respond with success
    return res.status(statusCode.create).json(apiResponseSuccess(null, true, statusCode.create, 'Balance added to user(s) successfully'));
  } catch (error) {
    console.error('Error:', error);
    return res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

export const userGame = async (req, res) => {
  try {
    const response = await axios.get('http://localhost:7000/api/user-games');
    console.log("response from API", response.data);

    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, false, statusCode.badRequest, 'Failed to fetch games'));
    }

    const { data, success, message, pagination } = response.data;

    const paginationData = pagination || {};
    const gameData = data || [];

    return res
      .status(statusCode.success)
      .json(apiResponseSuccess(gameData, success, statusCode.success, message, paginationData));
  } catch (error) {
    console.error('Error fetching games:', error.message || error);  
    res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

// authorization is pending
export const getUserBetHistory = async (req, res) => {
  try {
    const { gameId, userName } = req.params;
    const { startDate, endDate, page = 1, limit = 5 } = req.query;

    let start = null;
    let end = null;

    if (startDate) {
      start = moment(startDate, ['YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY/MM/DD'], true);
      if (!start.isValid()) {
        throw new Error('startDate is not a valid date');
      }
    }

    if (endDate) {
      end = moment(endDate, ['YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY/MM/DD'], true);
      if (!end.isValid()) {
        throw new Error('endDate is not a valid date');
      }
      if (end.isAfter(moment())) {
        throw new Error('Invalid End Date');
      }
    }

    if (start && end && end.isBefore(start)) {
      throw new Error('endDate should be after startDate');
    }

    const params = {
      gameId,
      userName,
      startDate: start ? start.format('YYYY-MM-DD') : undefined,
      endDate: end ? end.format('YYYY-MM-DD') : undefined,
      page,
      limit
    };
    const response = await axios.get(`http://localhost:7000/api/external-user-betHistory/${userName}/${gameId}`, { params });

    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, false, statusCode.badRequest, 'Failed to fetch bet history'));
    }

    const { data, pagination } = response.data;

    const totalPages = pagination ? pagination.totalPages : 1;
    const totalItems = pagination ? pagination.totalItems : 0;

    return res
      .status(statusCode.success)
      .json(apiResponseSuccess(
        data,
        true,
        statusCode.success,
        'Success',
        { totalPages, limit: parseInt(limit), totalItems, page: parseInt(page) }
      ));
  } catch (error) {
    console.error("Error from API:", error.response ? error.response.data : error.message);
    res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

export const getColorGameProfitLoss = async (req, res) => {
  try {
    const userName = req.params.userName
    const startDate = moment(req.query.startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const endDate = moment(req.query.endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');

    const params = {
      userName,
      startDate,
      endDate,
    };

    const response = await axios.get(`http://localhost:7000/api/external-profit_loss/${userName}`, { params });

    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, false, statusCode.badRequest, 'Failed to fetch data'));
    }

    const { data, pagination } = response.data;

    const paginationData = pagination || {};

    return res
      .status(statusCode.success)
      .send(
        apiResponseSuccess(
          data,
          true,
          statusCode.success,
          'Success',
          paginationData,
        ),
      );
  } catch (error) {
    console.error("Error from API:", error.response ? error.response.data : error.message);
    res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

export const marketProfitLoss = async (req, res) => {
  try {
    const { gameId, userName } = req.params;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
  
    const params = {
      userName,
      gameId,
      startDate,
      endDate,
    };

    const response = await axios.get(`http://localhost:7000/api/external-profit_loss_market/${userName}/${gameId}`, { params });

    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, false, statusCode.badRequest, 'Failed to fetch data'));
    }

    const { data, pagination } = response.data;

    const paginationData = pagination || {};

    return res
      .status(statusCode.success)
      .send(
        apiResponseSuccess(
          data,
          true,
          statusCode.success,
          'Success',
          paginationData,
        ),
      );
  } catch (error) {
    console.error("Error from API:", error.response ? error.response.data : error.message);
    res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

export const runnerProfitLoss = async (req, res) => {
  try {
    const { marketId, userName } = req.params;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
   
    const params = {
      userName,
      marketId,
      startDate,
      endDate,
    };

    const response = await axios.get(`http://localhost:7000/api/external-profit_loss_runner/${userName}/${marketId}`, { params });

    if (!response.data.success) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, false, statusCode.badRequest, 'Failed to fetch data'));
    }

    const { data, pagination } = response.data;

    const paginationData = pagination || {};

    return res
      .status(statusCode.success)
      .send(
        apiResponseSuccess(
          data,
          true,
          statusCode.success,
          'Success',
          paginationData,
        ),
      );
  } catch (error) {
    console.error("Error from API:", error.response ? error.response.data : error.message);
    res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};