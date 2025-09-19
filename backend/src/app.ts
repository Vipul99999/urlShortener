import express from 'express';
import cors from 'cors';
import shorturlsRouter from './routes/shorturls';
import loggingMiddleware from './middleware/logging';
import errorHandler from './middleware/errorHandler';
import prisma from './lib/prisma';
import rateLimiterMiddleware from './middleware/rateLimiter';
// app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(loggingMiddleware);

// global middleware before routes
app.use(rateLimiterMiddleware);
// routes
app.use('/shorturls', shorturlsRouter);

// redirect route (put after other routes)
app.get('/:shortcode', async (req, res) => {
  try {
    const sc = req.params.shortcode;
    const s = await prisma.shortUrl.findUnique({ where: { shortcode: sc } });
    if (!s) return res.status(404).json({ error: 'shortcode not found' });
    if (s.expiresAt < new Date()) return res.status(410).json({ error: 'link expired' });

    // record click
    const ref = (req.get('referer') || req.get('referrer') || null) as string | null;
    const ua = (req.get('user-agent') || null) as string | null;
    const country = (req.get('cf-ipcountry') || null) as string | null;

    await prisma.click.create({
      data: {
        shortUrlId: s.id,
        referrer: ref,
        userAgent: ua,
        country: country
      }
    });

    return res.redirect(302, s.url);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

app.use(errorHandler);

export default app;
