export const apiResponseErr = (data, success, responseCode, errMessage) => {
  return {
    data: data,
    success: success,
    responseCode: responseCode,
    errMessage: errMessage ?? 'Something went wrong',
  };
};
export const apiResponseSuccess = (data, pagination, success, successCode, message) => {
  return {
    data: data,
    pagination: pagination,
    success: success,
    successCode: successCode,
    message: message,
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
