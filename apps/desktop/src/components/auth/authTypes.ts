import { ApiRequestError } from '../../lib/api';

export interface AuthResult {
  accessToken?: string;
  token?: string;
  userId: number;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface AuthUser {
  email: string;
  fullName: string;
  userId: number;
  avatarUrl?: string;
}

export function authErrorMessage(error: unknown, vi: boolean): string {
  if (error instanceof ApiRequestError && error.isNetworkError) {
    return vi
      ? 'Không thể kết nối tới máy chủ. Kiểm tra kết nối và thử lại.'
      : 'Could not reach the server. Check your connection and try again.';
  }
  if (error instanceof ApiRequestError && error.status === 401) {
    return vi ? 'Email hoặc mật khẩu chưa đúng.' : 'The email or password is incorrect.';
  }
  if (error instanceof ApiRequestError && error.status === 409) {
    return vi ? 'Email này đã được đăng ký. Bạn có thể đăng nhập.' : 'This email is already registered. You can sign in instead.';
  }
  if (error instanceof ApiRequestError && error.status === 429) {
    return vi ? 'Bạn thử quá nhiều lần. Vui lòng đợi một lát.' : 'Too many attempts. Please wait a moment.';
  }
  return error instanceof Error && error.message
    ? error.message
    : vi ? 'Đã có lỗi xảy ra. Vui lòng thử lại.' : 'Something went wrong. Please try again.';
}

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
