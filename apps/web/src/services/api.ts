import {
  AuthenticatedUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@wordchain/shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
const BASE_URL = `${SERVER_URL}/api/v1`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Automatically passes and receives cookies
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'An unexpected request error occurred');
  }

  return data;
}

export const api = {
  auth: {
    async register(input: RegisterInput): Promise<{ user: AuthenticatedUser; token?: string; verificationToken?: string }> {
      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async login(input: LoginInput): Promise<{ user: AuthenticatedUser; token?: string }> {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async logout(): Promise<void> {
      return request('/auth/logout', { method: 'POST' });
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
