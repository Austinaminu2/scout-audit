use std::path::Path;

use anyhow::Result;

use crate::models::Finding;

use super::{extract_pub_fns, read_rust_sources, Rule};

const WRITE_PATTERNS: &[&str] = &[
    "storage().persistent().set(",
    "storage().instance().set(",
    "storage().temporary().set(",
];

pub struct EventEmission;

impl Rule for EventEmission {
    fn name(&self) -> &'static str {
        "event_emission"
    }

    fn check(&self, path: &Path) -> Result<Vec<Finding>> {
        let mut findings = Vec::new();

        for (file, source) in read_rust_sources(path) {
            for func in extract_pub_fns(&source) {
                let writes_storage = WRITE_PATTERNS.iter().any(|p| func.body.contains(p));
                let emits_event = func.body.contains("events().publish(");

                if writes_storage && !emits_event {
                    findings.push(Finding {
                        title: "State-changing function doesn't emit an event".to_string(),
                        severity: "low".to_string(),
                        description: format!(
                            "`{}` changes contract storage but doesn't call \
                             `env.events().publish(...)`. Off-chain indexers and integrators \
                             typically rely on events to track state changes.",
                            func.name
                        ),
                        file: Some(file.display().to_string()),
                        line: Some(func.start_line),
                        source: "events".to_string(),
                    });
                }
            }
        }

        Ok(findings)
    }
}
