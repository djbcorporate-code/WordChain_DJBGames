/**
 * Authoritative Origin validator for WordChain Express and Socket.IO servers.
 *
 * Designed to ensure zero CORS rejection issues across:
 * - Vercel deployments (production domains, *.vercel.app preview branches)
 * - Render services (*.onrender.com)
 * - Localhost development on ANY port (5173, 5174, 4173, 3000, 4000, etc.)
 * - Local network IPs for mobile testing (192.168.*, 10.*, 172.16-31.*)
 * - Custom domains specified in CLIENT_ORIGIN
 * - Default open access if CLIENT_ORIGIN is not strictly restricted
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // Non-browser or same-origin requests (cURL, native mobile, server-to-server)
    return true;
  }

  const clientOriginEnv = process.env.CLIENT_ORIGIN?.trim();

  // If explicitly configured with custom origins (comma-separated)
  if (clientOriginEnv && clientOriginEnv !== '*') {
    const customOrigins = clientOriginEnv
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, '').toLowerCase())
      .filter(Boolean);

    const normalizedOrigin = origin.replace(/\/+$/, '').toLowerCase();
    if (customOrigins.includes(normalizedOrigin)) {
      return true;
    }
  }

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();

    // 1. Allow localhost and loopback on ANY port
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return true;
    }

    // 2. Allow local LAN IPs on ANY port (for mobile phone testing on Wi-Fi)
    if (
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.16.') ||
      host.startsWith('172.17.') ||
      host.startsWith('172.18.') ||
      host.startsWith('172.19.') ||
      host.startsWith('172.20.') ||
      host.startsWith('172.21.') ||
      host.startsWith('172.22.') ||
      host.startsWith('172.23.') ||
      host.startsWith('172.24.') ||
      host.startsWith('172.25.') ||
      host.startsWith('172.26.') ||
      host.startsWith('172.27.') ||
      host.startsWith('172.28.') ||
      host.startsWith('172.29.') ||
      host.startsWith('172.30.') ||
      host.startsWith('172.31.')
    ) {
      return true;
    }

    // 3. Allow all Vercel domains (both production and ephemeral preview deployments)
    if (host.endsWith('.vercel.app') || host === 'vercel.app') {
      return true;
    }

    // 4. Allow Render backend domains (in case UI is served from Render)
    if (host.endsWith('.onrender.com') || host === 'onrender.com') {
      return true;
    }
  } catch {
    // Malformed origin
  }

  // 5. If CLIENT_ORIGIN is not strictly restricted to specific domains, allow by default
  if (!clientOriginEnv || clientOriginEnv === '*') {
    return true;
  }

  return false;
}
