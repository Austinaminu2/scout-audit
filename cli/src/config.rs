/// Audit score at or above which a contract is considered ready for a
/// professional audit.
pub const SCORE_THRESHOLD_READY: u32 = 70;

pub const SEVERITY_WEIGHT_CRITICAL: u32 = 20;
pub const SEVERITY_WEIGHT_HIGH: u32 = 10;
pub const SEVERITY_WEIGHT_MEDIUM: u32 = 2;

/// Scout runs a full Dylint-based static analysis pass and can be slow on
/// large crates; bound it so a hung or unusually slow run doesn't hang the
/// whole scan indefinitely.
pub const SCOUT_TIMEOUT_SECS: u64 = 120;
