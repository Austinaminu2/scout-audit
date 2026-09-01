use std::path::Path;

use anyhow::Result;

use crate::models::Finding;

use super::{extract_pub_fns, read_rust_sources, Rule};

const WRITE_PATTERNS: &[&str] = &["storage().persistent().set(", "storage().instance().set("];

const TTL_PATTERNS: &[&str] = &["extend_ttl", "extend_persistent", "extend_instance", "bump("];

pub struct TtlManagement;

impl Rule for TtlManagement {
    fn name(&self) -> &'static str {
        "ttl_management"
    }

    fn check(&self, path: &Path) -> Result<Vec<Finding>> {
        let mut findings = Vec::new();

        for (file, source) in read_rust_sources(path) {
            for func in extract_pub_fns(&source) {
                let writes_storage = WRITE_PATTERNS.iter().any(|p| func.body.contains(p));
                let extends_ttl = TTL_PATTERNS.iter().any(|p| func.body.contains(p));

                if writes_storage && !extends_ttl {
                    findings.push(Finding {
                        title: "Storage entry written without extending its TTL".to_string(),
                        severity: "medium".to_string(),
                        description: format!(
                            "`{}` writes persistent/instance storage but doesn't appear to \
                             extend its TTL. Soroban entries expire and are purged from the \
                             ledger once their TTL runs out -- without an explicit extend, this \
                             entry may vanish unexpectedly.",
                            func.name
                        ),
                        file: Some(file.display().to_string()),
                        line: Some(func.start_line),
                        source: "ttl".to_string(),
                    });
                }
            }
        }

        Ok(findings)
    }
}
