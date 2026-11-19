
import { env } from "../../../config/env";
import { AppError, ErrorCode } from "@flashurl/errors";

interface VerifiedAccessToken {
  userId: string;
}

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export async function verifyAccessToken(
  token: string
): Promise<VerifiedAccessToken> {
  const { jwtVerify } = await import("jose");

  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ["HS256"]
    });

    if (payload.token_use !== "access" || !payload.sub) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    return {
      userId: payload.sub
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(ErrorCode.UNAUTHORIZED);
  }
}
