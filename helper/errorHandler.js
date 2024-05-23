export const apiResponseErr = (data, success, responseCode, errMessage) => {
  return {
    data: data,
    success: success,
    responseCode: responseCode,
    errMessage: errMessage ?? 'Something went wrong',
  };
};
export const apiResponseSuccess = (data, success, successCode, message, pagination) => {
  return {
    data: data,
    success: success,
    successCode: successCode,
    message: message,
    pagination: pagination,
  };
};

export const apiResponsePagination = (page, totalPages, totalItems, message) => {
  return {
    page: page,
    totalPages: totalPages,
    totalItems: totalItems,
    message: message,
  };
};
