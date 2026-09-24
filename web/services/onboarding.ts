import type { Profile } from '@/state/authStore';

export type OnboardingRoute = '/intro' | '/tutorial';

/**
 * First-run flow: Splash → Intro → Tutorial → Character setup → Home.
 * Returns where a player still in that flow must go, or null once they are done.
 */
export function onboardingRoute(profile: Profile): OnboardingRoute | null {
  if (!profile.onboarding.hasSeenIntro) return '/intro';
  if (!profile.onboarding.hasCompletedTutorial) return '/tutorial';
  return null;
}
