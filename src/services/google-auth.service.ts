import { encryptDeterministic } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { validateEmail } from '@/lib/validation';
import { ensureUserPublicId } from './user-identity.service';

const GOOGLE_PROVIDER = 'google';

export interface GoogleIdentityProfile {
  sub?: string | null;
  email?: string | null;
  email_verified?: boolean | null;
  name?: string | null;
  picture?: string | null;
}

interface FinTrackUser {
  id: bigint;
  public_id: string | null;
  ai_recommendation_enabled: boolean;
  role: 'USER' | 'SUPERADMIN';
  session_version: number;
}

interface GoogleSessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  ai_recommendation_enabled: boolean;
  role: 'USER' | 'SUPERADMIN';
  session_version: number;
}

interface ProviderSessionUserInput {
  user: { id: string; email?: string | null };
  account?: { provider?: string } | null;
  profile?: GoogleIdentityProfile;
}

async function toSessionUser(
  user: FinTrackUser,
  email: string,
  profile: GoogleIdentityProfile,
  repository: Parameters<typeof ensureUserPublicId>[1],
): Promise<GoogleSessionUser> {
  return {
    id: await ensureUserPublicId(user, repository),
    email,
    name: profile.name ?? null,
    image: profile.picture ?? null,
    ai_recommendation_enabled: user.ai_recommendation_enabled,
    role: user.role,
    session_version: user.session_version,
  };
}

/**
 * Links a verified Google subject to exactly one FinTrack user.
 * Email is used only for the initial link; subsequent logins use Google's stable subject.
 * Database roles are preserved and can only be changed by the explicit admin tooling.
 */
export async function provisionGoogleUser(profile: GoogleIdentityProfile): Promise<GoogleSessionUser> {
  const subject = profile.sub;
  const email = profile.email?.trim().toLowerCase();
  const emailValidation = validateEmail(email ?? '');

  if (!subject || !profile.email_verified || !email || !emailValidation.valid) {
    throw new Error('Google sign-in requires a verified email address and stable account identifier');
  }

  const encryptedEmail = encryptDeterministic(email);

  return prisma.$transaction(async (tx) => {
    const linkedAccount = await tx.oauthAccount.findUnique({
      where: {
        provider_provider_account_id: {
          provider: GOOGLE_PROVIDER,
          provider_account_id: subject,
        },
      },
      include: { user: true },
    });
    if (linkedAccount) return toSessionUser(linkedAccount.user, email, profile, tx.user);

    const existingUser = await tx.user.findUnique({ where: { email: encryptedEmail } });
    if (existingUser) {
      const existingGoogleLink = await tx.oauthAccount.findUnique({
        where: {
          user_id_provider: {
            user_id: existingUser.id,
            provider: GOOGLE_PROVIDER,
          },
        },
      });
      if (existingGoogleLink) {
        throw new Error('This FinTrack account is already linked to another Google account');
      }

      await tx.oauthAccount.create({
        data: {
          user_id: existingUser.id,
          provider: GOOGLE_PROVIDER,
          provider_account_id: subject,
        },
      });
      return toSessionUser(existingUser, email, profile, tx.user);
    }

    const newUser = await tx.user.create({
      data: {
        email: encryptedEmail,
        password_hash: null,
        role: 'USER',
      },
    });
    await tx.oauthAccount.create({
      data: {
        user_id: newUser.id,
        provider: GOOGLE_PROVIDER,
        provider_account_id: subject,
      },
    });
    return toSessionUser(newUser, email, profile, tx.user);
  });
}

/**
 * Auth.js intentionally replaces OAuth profile IDs with temporary UUIDs when no
 * adapter is configured. Resolve Google logins back to FinTrack's numeric user
 * before the JWT callback persists the session.
 */
export async function resolveSessionUserForProvider({
  user,
  account,
  profile,
}: ProviderSessionUserInput): Promise<ProviderSessionUserInput['user'] | GoogleSessionUser> {
  if (account?.provider !== GOOGLE_PROVIDER || !profile) return user;
  return provisionGoogleUser(profile);
}
