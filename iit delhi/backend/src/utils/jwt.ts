import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JWTPayload } from "../types/auth";

export function signToken(payload: { id: string; phone: string }): string {
  const jwtPayload: JWTPayload = {
    sub: payload.id,
    phone: payload.phone,
  };

  return jwt.sign(jwtPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}
