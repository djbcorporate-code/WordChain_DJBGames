import {
  AuthenticatedUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@wordchain/shared';

const BASE_URL = '/api/v1';

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
};
