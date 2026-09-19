import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    res.status(401).json({
      error: "Unauthorized",
    });
    return;
  }

  res.locals.userId = userId;

  next();
}
