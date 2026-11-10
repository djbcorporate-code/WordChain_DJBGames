/**
 * Validates incoming HTTP / WebSocket Origin headers against allowed domains.
 * Supports:
 * - Local development origins (localhost, 127.0.0.1)
 * - Custom origins defined via comma-separated CLIENT_ORIGIN environment variable
 * - Any Vercel deployment preview or production domain (*.vercel.app)
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // Allow non-browser agents (cURL, mobile native, server-to-server)
    return true;
  }

  const defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
  ];

  if (defaultOrigins.includes(origin)) {
    return true;
  }

  const customOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (customOrigins.includes('*') || customOrigins.includes(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    // Allow Vercel preview and production subdomains
    if (parsed.hostname.endsWith('.vercel.app') || parsed.hostname === 'vercel.app') {
      return true;
    }
  } catch {
    // Malformed origin
  }

  return false;
}
