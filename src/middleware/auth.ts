import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { env } from "../config/env.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

const clientOrigin = env.CLIENT_ORIGIN.replace(/\/$/, "");

// jose caches the fetched keys, so verification only hits the client once.
const jwks = createRemoteJWKSet(new URL(`${clientOrigin}/api/auth/jwks`));

function unauthorized(response: Response) {
  response.status(401).json({ success: false, message: "Sign in to continue." });
}

/**
 * Verifies the BetterAuth JWT sent as `Authorization: Bearer <token>`.
 * Identity always comes from the verified token, never from the request body.
 */
export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const header = request.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!token) {
    unauthorized(response);
    return;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: clientOrigin,
      audience: clientOrigin,
    });

    const id = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!id || !email) {
      unauthorized(response);
      return;
    }

    const rawName = typeof payload.name === "string" ? payload.name.trim() : "";
    const image = typeof payload.image === "string" && payload.image.trim() ? payload.image.trim() : null;

    request.user = {
      id,
      email: email.toLowerCase(),
      name: rawName || email.split("@")[0],
      image,
    };
    next();
  } catch {
    unauthorized(response);
  }
}

/** Reads the identity attached by `requireAuth`; throws a 401 otherwise. */
export function currentUser(request: Request): AuthUser {
  if (!request.user) {
    const error = new Error("Sign in to continue.") as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }
  return request.user;
}
