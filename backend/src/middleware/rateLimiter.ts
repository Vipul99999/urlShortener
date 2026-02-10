import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';


// configure rate limiter (100 requests per 15 minutes per IP)
const rateLimiter = new RateLimiterMemory({
  points: 100,      // number of points
  duration: 900,    // per 15 minutes
  blockDuration: 60 // block for 1 min if consumed more than points
});

export default function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
 const ip = req.ip || 'unknown';
  if (!ip) {
  return res.status(400).json({ error: 'IP address not found' });
}

  rateLimiter.consume(ip, 1)
  .then(() => next())
  .catch((err) => {
    if (err instanceof Error) {
      console.error('Rate limiter error:', err);
      return res.status(500).json({ error: 'Rate limiter unavailable' });
    }
    res.status(429).json({ error: 'Too many requests' });
  });
}
