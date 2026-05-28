export const apiActions = {
  config: "config",
  dashboard: "dashboard",
  importFingerprints: "importFingerprints",
  importBatch: "importBatch",
} as const;

export type ApiAction = (typeof apiActions)[keyof typeof apiActions];
