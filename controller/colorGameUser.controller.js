import colorGameUserSchema from '../models/colorGameUser.model.js';
import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { statusCode } from '../helper/statusCodes.js';
import axios from 'axios';
import { v4 as uuid4 } from 'uuid';
import bcrypt from 'bcrypt';

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