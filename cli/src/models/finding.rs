use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub title: String,
    /// critical, high, medium, low, info
    pub severity: String,
    pub description: String,
    pub file: Option<String>,
    pub line: Option<usize>,
    /// scout, auth_checks, storage_safety, etc.
    pub source: String,
}
