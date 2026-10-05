export const apiActions = {
  config: "config",
  dashboard: "dashboard",
  importFingerprints: "importFingerprints",
  importBatch: "importBatch",
  allotments: "allotments",
  saveAllotment: "saveAllotment",
  deleteAllotment: "deleteAllotment",
} as const;

export type ApiAction = (typeof apiActions)[keyof typeof apiActions];
