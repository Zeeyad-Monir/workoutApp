export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CompFit! 💪',
    description: 'Let\'s quickly show you around. Compete with friends and track your fitness journey.',
    targetId: 'bottom-navigation',
    spotlightShape: 'rectangle',
    spotlightPadding: 12,
    preferredPosition: 'above', // Show card above bottom navigation
  },
  {
    id: 'competitions',
    title: 'Your Competition Hub',
    description: 'View active competitions, pending invites, and completed challenges all in one place.',
    targetId: 'competition-tabs',
    spotlightShape: 'rectangle',
    spotlightPadding: 8,
    preferredPosition: 'below', // Show card below tabs
  },
  {
    id: 'create',
    title: 'Create Competitions',
    description: 'Challenge your friends! Choose from presets or customize your own rules.',
    targetId: 'create-tab',
    spotlightShape: 'circle',
    spotlightRadius: 35,
    preferredPosition: 'above', // Show card above the create button
  },
  {
    id: 'submit',
    title: 'Track Your Workouts',
    description: 'Submit daily activities, attach photos, and earn points based on competition rules.',
    targetId: 'competition-card-area',
    mockElement: 'submission-card',
    requiresActiveCompetition: true,
    spotlightShape: 'rectangle',
    spotlightPadding: 15,
    preferredPosition: 'below', // Show card below competition card
  },
  {
    id: 'leaderboard',
    title: 'Check Your Ranking',
    description: 'See how you stack up against friends. Some competitions hide scores for extra suspense!',
    targetId: 'competition-card-area',
    mockElement: 'leaderboard-view',
    requiresActiveCompetition: true,
    spotlightShape: 'rectangle',
    spotlightPadding: 15,
    preferredPosition: 'below', // Show card below competition card
  },
  {
    id: 'profile',
    title: 'Connect with Friends',
    description: 'Add friends, track your stats, and manage your profile. Ready to compete?',
    targetId: 'profile-tab',
    spotlightShape: 'circle',
    spotlightRadius: 35,
    preferredPosition: 'above', // Show card above profile button
  },
];