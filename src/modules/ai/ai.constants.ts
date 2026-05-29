export enum AiFeature {
  ai = "ai",
  caption = "caption",
  rank = "rank",
  pick = "pick",
  rewrite = "rewrite",
}

export const aiFeatures = Object.values(AiFeature);

export enum AiUsageStatus {
  success = "success",
  failed = "failed",
  blocked = "blocked",
  timeout = "timeout",
}

export const aiUsageStatuses = Object.values(AiUsageStatus);

export enum AiFeedbackResult {
  accepted = "accepted",
  dismissed = "dismissed",
  reverted = "reverted",
}

export const aiFeedbackResults = Object.values(AiFeedbackResult);
