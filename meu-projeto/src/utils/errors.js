class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, "VALIDATION_ERROR");
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super(`${resource} não encontrado`, 404, "NOT_FOUND");
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Não autorizado") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Acesso negado") {
    super(message, 403, "FORBIDDEN");
  }
}

class ConflictError extends AppError {
  constructor(message, field = null) {
    super(message, 409, "CONFLICT");
    this.field = field;
  }
}

class DatabaseError extends AppError {
  constructor(message = "Erro no banco de dados") {
    super(message, 500, "DATABASE_ERROR");
  }
}

const createError = {
  validation: (message, field = null) => new ValidationError(message, field),
  notFound: (resource = "Recurso") => new NotFoundError(resource),
  unauthorized: (message) => new UnauthorizedError(message),
  forbidden: (message) => new ForbiddenError(message),
  conflict: (message, field = null) => new ConflictError(message, field),
  database: (message) => new DatabaseError(message),
  generic: (message, statusCode = 500, code = null) => new AppError(message, statusCode, code)
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
  createError
};