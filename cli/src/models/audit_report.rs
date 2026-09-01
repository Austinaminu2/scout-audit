use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::{Finding, GasProfile};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditReport {
    pub findings: Vec<Finding>,
    /// `None` when gas profiling wasn't run or wasn't possible (it requires
    /// a compiled `.wasm`, not Rust source).
    pub gas_profile: Option<GasProfile>,
    pub score: u32,
    /// `score >= config::SCORE_THRESHOLD_READY`
    pub ready_for_audit: bool,
    pub timestamp: DateTime<Utc>,
}
