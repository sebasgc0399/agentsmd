/**
 * Shared constants for benchmark scripts (lite, p1, p2).
 * Single source of truth — avoids threshold drift between scripts.
 */

export const SCORE_THRESHOLDS = {
  compact: 7,
  standard: 8,
  full: 9,
};

export const COMMAND_PRECISION_THRESHOLDS = {
  compact: 0.9,
  standard: 0.95,
  full: 0.95,
};
