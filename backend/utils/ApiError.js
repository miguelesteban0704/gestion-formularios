export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Unauthorized", details) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = "Forbidden", details) {
    return new ApiError(403, message, details);
  }

  static notFound(message = "Resource not found", details) {
    return new ApiError(404, message, details);
  }

  static conflict(message = "Conflict", details) {
    return new ApiError(409, message, details);
  }

  static internal(message = "Something went wrong", details) {
    return new ApiError(500, message, details);
  }
}
