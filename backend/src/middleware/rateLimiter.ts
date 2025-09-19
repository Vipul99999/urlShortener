import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import redis from '../lib/redis';

// configure rate limiter (e.g., 100 requests per 15 minutes per IP)
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rlflx',
  points: 100, // number of points
  duration: 900, // per 15 minutes
  blockDuration: 60 // block for 1 min if consumed more than points
});

export default function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip;
  rateLimiter.consume(ip, 1)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({ error: 'Too many requests' });
    });
}
