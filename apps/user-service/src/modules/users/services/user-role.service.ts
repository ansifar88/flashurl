
import { AppError, ErrorCode } from "@flashurl/errors";

import { findUserById } from "../repositories/user.repository";
import type { UserRole } from "../models/user.model";

export interface UserAuthorizationContext {
  userId: string;
  role: UserRole;
}

export async function getUserAuthorizationContext(
  userId: string,
): Promise<UserAuthorizationContext> {
  const user = await findUserById(userId);

  if (!user || !user.isActive) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  return {
    userId: user.id,
    role: user.role,
  };
}
