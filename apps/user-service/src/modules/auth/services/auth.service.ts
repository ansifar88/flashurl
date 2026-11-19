
import { AppError, ErrorCode } from "@flashurl/errors";

import { findUserByEmail } from "../../users/repositories/user.repository";
import { verifyPassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token";

import { findUserById } from "../../users/repositories/user.repository";
import { verifyRefreshToken } from "../utils/token";

interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: {
    id: string;
    name: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

export async function loginUser(
  input: LoginInput
): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();

  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    throw new AppError(ErrorCode.INVALID_CREDENTIALS);
  }

  const isPasswordValid = await verifyPassword(
    user.passwordHash,
    input.password
  );
  if (!isPasswordValid) {
    throw new AppError(ErrorCode.INVALID_CREDENTIALS);
  }

  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user.id),
    generateRefreshToken(user.id),
  ]);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
}


export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function refreshUserSession(
  token: string
): Promise<RefreshResult> {
  let userId: string;

  try {
    const payload = await verifyRefreshToken(token);
    userId = payload.userId;
  } catch {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const user = await findUserById(userId);

  if (!user || !user.isActive) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user.id),
    generateRefreshToken(user.id),
  ]);

  return {
    accessToken,
    refreshToken,
  };
}
