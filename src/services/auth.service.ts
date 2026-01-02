/**
 * Authentication Service
 * 
 * Provides authentication functionality including:
 * - Password hashing and verification using bcrypt
 * - User registration with email encryption
 * - Credential validation for login
 */

import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic, decrypt } from '@/lib/encryption';
import { validateEmail, validatePassword } from '@/lib/validation';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface RegisterResult {
  success: boolean;
  user?: {
    id: bigint;
    email: string;
    created_at: Date;
  };
  error?: string;
}

/**
 * Register a new user with email encryption and password hashing
 */
export async function register(email: string, password: string): Promise<RegisterResult> {
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.errors[0] };
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.errors[0] };
  }

  // Encrypt email for storage (deterministic for lookups)
  const encryptedEmail = encryptDeterministic(email.toLowerCase().trim());

  // Check for duplicate email by comparing encrypted values
  const existingUser = await prisma.user.findUnique({
    where: { email: encryptedEmail },
  });

  if (existingUser) {
    return { success: false, error: 'Email already registered' };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: encryptedEmail,
      password_hash: passwordHash,
    },
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: email.toLowerCase().trim(), // Return original email, not encrypted
      created_at: user.created_at,
    },
  };
}

export interface ValidateCredentialsResult {
  user: {
    id: bigint;
    email: string;
    ai_recommendation_enabled: boolean;
    created_at: Date;
  } | null;
}

/**
 * Validate user credentials for login
 * Returns user if valid, null if invalid
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<ValidateCredentialsResult> {
  // Encrypt email to search in database (deterministic)
  const encryptedEmail = encryptDeterministic(email.toLowerCase().trim());

  // Find user by encrypted email
  const user = await prisma.user.findUnique({
    where: { email: encryptedEmail },
  });

  if (!user) {
    return { user: null };
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password_hash);

  if (!isValidPassword) {
    return { user: null };
  }

  // Return user with decrypted email
  return {
    user: {
      id: user.id,
      email: decrypt(user.email),
      ai_recommendation_enabled: user.ai_recommendation_enabled,
      created_at: user.created_at,
    },
  };
}

/**
 * Get user by ID with decrypted email
 */
export async function getUserById(userId: bigint) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: decrypt(user.email),
    ai_recommendation_enabled: user.ai_recommendation_enabled,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
