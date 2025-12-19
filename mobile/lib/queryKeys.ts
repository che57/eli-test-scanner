export const queryKeys = {
  health: (platform: string, url: string) => ['backend-health', platform, url] as const,
};
