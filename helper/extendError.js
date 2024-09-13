class CustomError extends Error {
  constructor(message, data = null, responseCode = 500) {
    super(message);
    this.data = data;
    this.responseCode = responseCode;
  }
}

export default CustomError;
