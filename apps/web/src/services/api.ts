import {
  AuthenticatedUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@wordchain/shared';

const SERVER_URL = (import.meta.env.VITE_SERVER_URL || '').replace(/\/+$/, '');
const BASE_URL = `${SERVER_URL}/api/v1`;

const TOKEN_STORAGE_KEY = 'wordchain_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore localStorage access issues
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Automatically passes and receives cookies
  });

  const data = await res.json().catch(() => ({ message: 'Invalid response from server' }));

  if (!res.ok) {
    if (res.status === 401 && endpoint === '/auth/me') {
      setStoredToken(null);
    }
    throw new Error(data.message || 'An unexpected request error occurred');
  }

  return data;
}

export const api = {
  auth: {
    async register(input: RegisterInput): Promise<{ user: AuthenticatedUser; token?: string; verificationToken?: string }> {
      const res = await request<{ user: AuthenticatedUser; token?: string; verificationToken?: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (res.token) {
        setStoredToken(res.token);
      }
      return res;
    },

    async login(input: LoginInput): Promise<{ user: AuthenticatedUser; token?: string }> {
      const res = await request<{ user: AuthenticatedUser; token?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (res.token) {
        setStoredToken(res.token);
      }
      return res;
    },

    async guestLogin(): Promise<{ user: AuthenticatedUser; token?: string }> {
      const res = await request<{ user: AuthenticatedUser; token?: string }>('/auth/guest', { method: 'POST' });
      if (res.token) {
        setStoredToken(res.token);
      }
      return res;
    },

    async logout(): Promise<void> {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        setStoredToken(null);
      }
    },

    async getMe(): Promise<{ user: AuthenticatedUser }> {
      return request('/auth/me');
    },

    async verifyEmail(input: VerifyEmailInput): Promise<{ message: string }> {
      return request('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string; resetToken?: string }> {
      return request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
      return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  },

  profile: {
    async get(username: string): Promise<{ success: boolean; profile: any }> {
      return request(`/profile/${encodeURIComponent(username)}`);
    },

    async updateAvatar(avatarId: string): Promise<{ success: boolean; avatarId: string }> {
      return request('/profile/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ avatarId }),
      });
    },
  },

  leaderboards: {
    async get(
      type: 'SEASONAL' | 'LIFETIME_WINS' | 'ACCOUNT_LEVEL' = 'SEASONAL',
      page: number = 1,
      limit: number = 20
    ): Promise<{
      success: boolean;
      type: string;
      season: { id: number; name: string };
      page: number;
      limit: number;
      totalScholars: number;
      totalPages: number;
      entries: any[];
    }> {
      return request(`/leaderboards?type=${type}&page=${page}&limit=${limit}`);
    },
  },

  admin: {
    async getTelemetry(): Promise<{ success: boolean; telemetry: any }> {
      return request('/admin/telemetry');
    },

    async suspendUser(userId: string, reason: string): Promise<{ success: boolean; message: string }> {
      return request(`/admin/users/${encodeURIComponent(userId)}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },

    async unsuspendUser(userId: string): Promise<{ success: boolean; message: string }> {
      return request(`/admin/users/${encodeURIComponent(userId)}/unsuspend`, {
        method: 'POST',
      });
    },

    async addLexiconWord(word: string): Promise<{ success: boolean; word: string }> {
      return request('/admin/lexicon/add-word', {
        method: 'POST',
        body: JSON.stringify({ word }),
      });
    },

    async banLexiconWord(word: string, reason?: string): Promise<{ success: boolean; word: string }> {
      return request('/admin/lexicon/ban-word', {
        method: 'POST',
        body: JSON.stringify({ word, reason }),
      });
    },

    async getAuditLogs(limit: number = 30): Promise<{ success: boolean; logs: any[] }> {
      return request(`/admin/audit-logs?limit=${limit}`);
    },
  },
};
