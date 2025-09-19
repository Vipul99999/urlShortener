// Shortcode generator + validator
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function randomShortcode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

export function validateCustomShortcode(v: string) {
  // allow alnum, underscore, hyphen; length 4..30
  return /^[A-Za-z0-9_-]{4,30}$/.test(v);
}
