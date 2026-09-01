use std::path::Path;

use anyhow::Result;

use crate::models::GasProfile;
use crate::utils::wasm_parser;

pub struct GasProfiler;

impl GasProfiler {
    pub fn new() -> Self {
        Self
    }

    /// Estimates relative gas cost for each exported function. Returns
    /// `None` when `contract_path` isn't a compiled `.wasm` file -- gas
    /// profiling needs the compiled artifact, not Rust source, so there's
    /// nothing honest to report for a `.rs` input.
    pub fn profile(&self, contract_path: &Path) -> Result<Option<GasProfile>> {
        if contract_path.extension().and_then(|e| e.to_str()) != Some("wasm") {
            return Ok(None);
        }

        let function_costs = wasm_parser::estimate_function_costs(contract_path)?;
        let total_operations = function_costs.len() as u64;
        let estimated_max = function_costs.values().max().copied().unwrap_or(0);

        Ok(Some(GasProfile {
            function_costs,
            total_operations,
            estimated_max,
        }))
    }
}

impl Default for GasProfiler {
    fn default() -> Self {
        Self::new()
    }
}
