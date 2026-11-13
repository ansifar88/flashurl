
import {
  ERROR_DEFINITIONS,
  type ErrorCode
} from "./error-codes";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    const definition = ERROR_DEFINITIONS[code];

    super(definition.message);

    this.name = "AppError";
    this.code = code;
    this.statusCode = definition.statusCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
