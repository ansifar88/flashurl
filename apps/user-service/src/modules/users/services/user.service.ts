
import { UniqueConstraintError } from "sequelize";
import { AppError, ErrorCode } from "@flashurl/errors";

import { createUser } from "../repositories/user.repository";
import { hashPassword } from "../../auth/utils/password";

interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export async function registerUser(
  input: RegisterUserInput
): Promise<RegisteredUser> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await createUser({
      name,
      email,
      passwordHash,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new AppError(ErrorCode.EMAIL_ALREADY_EXISTS);
    }

    throw error;
  }
}
