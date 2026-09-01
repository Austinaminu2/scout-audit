use std::path::Path;

use anyhow::Result;

use crate::models::Finding;

use super::{extract_pub_fns, read_rust_sources, Rule};

const WRITE_PATTERNS: &[&str] = &[
    "storage().persistent().set(",
    "storage().instance().set(",
    "storage().temporary().set(",
];

pub struct AuthChecks;

impl Rule for AuthChecks {
    fn name(&self) -> &'static str {
        "auth_checks"
    }

    fn check(&self, path: &Path) -> Result<Vec<Finding>> {
        let mut findings = Vec::new();

        for (file, source) in read_rust_sources(path) {
            for func in extract_pub_fns(&source) {
                let writes_storage = WRITE_PATTERNS.iter().any(|p| func.body.contains(p));
                let checks_auth = func.body.contains("require_auth");

                if writes_storage && !checks_auth {
                    findings.push(Finding {
                        title: "Possible missing authorization check".to_string(),
                        severity: "high".to_string(),
                        description: format!(
                            "`{}` writes to contract storage but doesn't appear to call \
                             `require_auth`. Verify that callers are authorized before state \
                             changes.",
                            func.name
                        ),
                        file: Some(file.display().to_string()),
                        line: Some(func.start_line),
                        source: "auth_checks".to_string(),
                    });
                }
            }
        }

        Ok(findings)
    }
}
