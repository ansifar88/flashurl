
import { AppError, ErrorCode } from "@flashurl/errors";

export class RedirectError extends AppError {
  constructor(code: ErrorCode) {
    super(code);
    this.name = "RedirectError";
  }
}
