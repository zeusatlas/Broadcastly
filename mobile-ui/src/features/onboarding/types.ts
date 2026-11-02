export type OnboardingScene = 'structure' | 'members' | 'approvals';

export type OnboardingStatus = 'loading' | 'pending' | 'done';

export interface OnboardingSlide {
  key: string;
  scene: OnboardingScene;
  title: string;
  description: string;
}
