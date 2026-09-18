import type { NextFunction, Request, Response } from "express";

export function requireAuth(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = res.locals.userId;

  if (!userId) {
    res.status(401).json({
      error: "Unauthorized",
    });
    return;
  }

  next();
}
