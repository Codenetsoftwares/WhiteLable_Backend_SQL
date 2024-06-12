import { validationResult } from 'express-validator';
import { statusCode } from './statusCodes.js';

const customErrorHandler = function (req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(function (error) {
      return {
        type: 'field',
        value: req.body[error.param],
        msg: error.msg,
        path: error.param,
        location: 'body',
      };
    });

    const allErrors = formattedErrors.map((formattedError) => formattedError.msg);

    return res.status(statusCode.badRequest).json({
      data: null,
      success: false,
      errMessage: formattedErrors[0].msg,
      responseCode: statusCode.badRequest,
      additionalErr: allErrors.join(', '),
    });
  }

  next();
};

export default customErrorHandler;
