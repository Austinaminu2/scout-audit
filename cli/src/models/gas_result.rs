use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasProfile {
    /// Heuristic, relative cost per exported function -- see
    /// `utils::wasm_parser` for how this is derived and its limitations.
    pub function_costs: HashMap<String, u64>,
    pub total_operations: u64,
    pub estimated_max: u64,
}
