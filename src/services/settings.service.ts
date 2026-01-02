/**
 * User Settings Service
 * 
 * Provides functionality for managing user settings including:
 * - AI recommendation toggle
 * - Getting user settings
 * - Updating user preferences
 */

import { prisma } from '@/lib/prisma';

export interface UserSettings {
  ai_recommendation_enabled: boolean;
}

/**
 * Get user settings by user ID
 */
export async function getUserSettings(userId: bigint): Promise<UserSettings | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ai_recommendation_enabled: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    ai_recommendation_enabled: user.ai_recommendation_enabled,
  };
}

/**
 * Update AI recommendation setting for a user
 */
export async function updateAIRecommendationSetting(
  userId: bigint,
  enabled: boolean
): Promise<UserSettings | null> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ai_recommendation_enabled: enabled,
      },
      select: {
        ai_recommendation_enabled: true,
      },
    });

    return {
      ai_recommendation_enabled: user.ai_recommendation_enabled,
    };
  } catch {
    // User not found or other error
    return null;
  }
}

/**
 * Check if AI recommendation is enabled for a user
 */
export async function isAIRecommendationEnabled(userId: bigint): Promise<boolean> {
  const settings = await getUserSettings(userId);
  
  // Default to true if user not found (matches requirement 12.5)
  if (!settings) {
    return true;
  }

  return settings.ai_recommendation_enabled;
}
