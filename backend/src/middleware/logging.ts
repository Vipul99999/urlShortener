// Example logging middleware placeholder - replace with your real logging middleware
import { Request, Response, NextFunction } from 'express';

export default function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Replace the console.log with your structured logger
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
}
