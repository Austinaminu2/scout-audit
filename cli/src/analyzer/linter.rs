use std::path::Path;

use anyhow::Result;

use crate::analyzer::rules::{
    arithmetic::ArithmeticSafety, auth_checks::AuthChecks, documentation::Documentation,
    error_codes::ErrorCodeConsistency, events::EventEmission, storage_safety::StorageSafety,
    ttl::TtlManagement, Rule,
};
use crate::models::Finding;

pub struct Linter {
    rules: Vec<Box<dyn Rule>>,
}

impl Linter {
    pub fn new() -> Self {
        Self {
            rules: vec![
                Box::new(AuthChecks),
                Box::new(StorageSafety),
                Box::new(ArithmeticSafety),
                Box::new(EventEmission),
                Box::new(TtlManagement),
                Box::new(ErrorCodeConsistency),
                Box::new(Documentation),
            ],
        }
    }

    /// Runs every rule, collecting all findings. A single rule failing
    /// (e.g. a bad regex match on unexpected input) is logged and skipped
    /// rather than aborting the whole lint pass.
    pub fn check(&self, contract_path: &Path) -> Result<Vec<Finding>> {
        let mut all_findings = Vec::new();

        for rule in &self.rules {
            match rule.check(contract_path) {
                Ok(findings) => all_findings.extend(findings),
                Err(e) => eprintln!("Rule '{}' failed: {e}", rule.name()),
            }
        }

        Ok(all_findings)
    }
}

impl Default for Linter {
    fn default() -> Self {
        Self::new()
    }
}
