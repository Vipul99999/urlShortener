import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { randomShortcode, validateCustomShortcode } from '../lib/shortcode';
import validUrl from 'valid-url';

const router = Router();

// create short url
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, validity, shortcode } = req.body;
    if (!url || !validUrl.isUri(url)) {
      return res.status(400).json({ error: 'Invalid or missing url' });
    }

    const minutes = Number.isInteger(validity) ? validity : 30;
    if (isNaN(minutes) || minutes <= 0) {
      return res.status(400).json({ error: 'validity must be positive integer minutes' });
    }

    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    // custom shortcode path
    if (shortcode) {
      if (!validateCustomShortcode(shortcode)) {
        return res.status(400).json({ error: 'invalid shortcode format' });
      }
      try {
        const created = await prisma.shortUrl.create({
          data: { shortcode, url, expiresAt }
        });
        return res.status(201).json({
          shortLink: `${process.env.BASE_URL}/${created.shortcode}`,
          expiry: created.expiresAt.toISOString()
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          return res.status(409).json({ error: 'shortcode already taken' });
        }
        throw e;
      }
    }

    // generate shortcode
    let attempts = 0;
    while (attempts < 10) {
      attempts++;
      const candidate = randomShortcode(10 + Math.floor(attempts / 2));
      try {
        const created = await prisma.shortUrl.create({
          data: { shortcode: candidate, url, expiresAt }
        });
        return res.status(201).json({
          shortLink: `${process.env.BASE_URL}/${created.shortcode}`,
          expiry: created.expiresAt.toISOString()
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          continue; // collision -> try again
        }
        throw e;
      }
    }

    return res.status(500).json({ error: 'Could not generate shortcode, try again' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// stats
router.get('/:shortcode', async (req: Request, res: Response) => {
  const { shortcode } = req.params;
  const s = await prisma.shortUrl.findUnique({
    where: { shortcode },
    include: { clicks: { orderBy: { timestamp: 'desc' } } }
  });
  if (!s) return res.status(404).json({ error: 'shortcode not found' });
  return res.json({
    shortcode: s.shortcode,
    originalUrl: s.url,
    createdAt: s.createdAt,
    expiry: s.expiresAt,
    clicksCount: s.clicks.length,
    clicks: s.clicks.map(c => ({
      timestamp: c.timestamp,
      referrer: c.referrer,
      country: c.country
    }))
  });
});

export default router;
