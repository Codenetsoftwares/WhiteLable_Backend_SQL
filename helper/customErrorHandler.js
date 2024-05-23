import { validationResult } from 'express-validator';

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

    return res.status(400).json({
      data: null,
      success: false,
      errMessage: formattedErrors[0].msg,
      responseCode: 400,
      additionalErr: allErrors.join(', '),
    });
  }

  next();
};

export default customErrorHandler;
