import colorGameUserSchema from '../models/colorGameUser.model.js';
import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { statusCode } from '../helper/statusCodes.js';
import axios from 'axios';
import { v4 as uuid4 } from 'uuid';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

export const userCreateColorGame = async (req, res) => {
    const { firstName, lastName, userName, phoneNumber, password } = req.body;
    
    try {
      const existingUser = await colorGameUserSchema.findOne({ where: { userName } });
  
      if (existingUser) {
        return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, 'User already exists'));
      }
  
      const userId = uuid4();
      const walletId = uuid4();
  
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      const newUser = await colorGameUserSchema.create({
        firstName,
        lastName,
        userName,
        userId,
        walletId,
        phoneNumber,
        password: hashedPassword,
        roles: 'user',
      });
  
      const data = {
        firstName,
        lastName,
        userName,
        userId : newUser.userId,
        walletId : newUser.walletId,
        password: newUser.password,
        roles: 'user',
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