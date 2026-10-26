import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface AuthSessionUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  shopId: number;
  phone?: string;
}

const AUTH_SECRET = process.env.AUTH_SECRET || 'dalim_store_super_secret_auth_jwt_key_2026_xyz123';

/**
 * Hash password with bcrypt cost >= 10
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare password with hash
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signPayload(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Create signed JWT token
 */
export function signToken(user: AuthSessionUser, expiresInHours = 24): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const payload = { ...user, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = signPayload(data, AUTH_SECRET);

  return `${data}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): AuthSessionUser | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = signPayload(data, AUTH_SECRET);

    if (signature !== expectedSig) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: Number(payload.id),
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role as UserRole,
      shopId: Number(payload.shopId),
      phone: payload.phone,
    };
  } catch {
    return null;
  }
}

/**
 * Role capability helpers
 */
export function isAdmin(user: AuthSessionUser): boolean {
  return user.role === 'admin';
}

export function isManagerOrAdmin(user: AuthSessionUser): boolean {
  return user.role === 'admin' || user.role === 'manager';
}

export function canViewProfits(user: AuthSessionUser): boolean {
  return user.role === 'admin' || user.role === 'manager';
}

export function canManageSettings(user: AuthSessionUser): boolean {
  return user.role === 'admin';
}

export function canManageUsers(user: AuthSessionUser): boolean {
  return user.role === 'admin';
}

export function canManageShops(user: AuthSessionUser): boolean {
  return user.role === 'admin';
}
