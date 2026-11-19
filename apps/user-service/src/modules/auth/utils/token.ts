
import { env } from "../../../config/env";

const ACCESS_SECRET = new TextEncoder().encode(
  env.JWT_ACCESS_SECRET
);

const REFRESH_SECRET = new TextEncoder().encode(
  env.JWT_REFRESH_SECRET
);

interface VerifiedToken {
  userId: string;
}

export async function generateAccessToken(
  userId: string
): Promise<string> {
  const { SignJWT } = await import("jose");

  return new SignJWT({
    token_use: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TOKEN_TTL}s`)
    .sign(ACCESS_SECRET);
}

export async function generateRefreshToken(
  userId: string
): Promise<string> {
  const { SignJWT } = await import("jose");

  return new SignJWT({
    token_use: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_REFRESH_TOKEN_TTL}s`)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(
  token: string
): Promise<VerifiedToken> {
  const { jwtVerify } = await import("jose");

  const { payload } = await jwtVerify(token, ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ["HS256"],
  });

  if (payload.token_use !== "access" || !payload.sub) {
    throw new Error("Invalid access token");
  }

  return { userId: payload.sub };
}

export async function verifyRefreshToken(
  token: string
): Promise<VerifiedToken> {
  const { jwtVerify } = await import("jose");

  const { payload } = await jwtVerify(token, REFRESH_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: ["HS256"],
  });

  if (payload.token_use !== "refresh" || !payload.sub) {
    throw new Error("Invalid refresh token");
  }

  return { userId: payload.sub };
}
