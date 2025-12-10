// Lightweight HTTP error class used across the API
// Allows throwing errors with status + code for the error handler.

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
