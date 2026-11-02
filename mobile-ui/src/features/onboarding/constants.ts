import type { OnboardingSlide } from './types';

export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    key: 'structure',
    scene: 'structure',
    title: 'Your constituency, organised',
    description:
      'See every unit and its executives in one place, with appointments kept up to date.',
  },
  {
    key: 'members',
    scene: 'members',
    title: 'Reach every member',
    description:
      'Keep the member directory current and send official SMS to the people who need it.',
  },
  {
    key: 'approvals',
    scene: 'approvals',
    title: 'Approved and accounted for',
    description:
      'Broadcasts follow your approval rules, use SMS credits and come with delivery reports.',
  },
];
