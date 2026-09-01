use std::path::Path;

use anyhow::Result;
use regex::Regex;

use crate::models::Finding;

use super::{read_rust_sources, Rule};

pub struct StorageSafety;

impl Rule for StorageSafety {
    fn name(&self) -> &'static str {
        "storage_safety"
    }

    fn check(&self, path: &Path) -> Result<Vec<Finding>> {
        let unwrap_after_get =
            Regex::new(r"storage\(\)\.\w+\(\)\.get(?:::<[^>]+>)?\([^)]*\)\.unwrap\(\)")
                .expect("valid regex");

        let mut findings = Vec::new();

        for (file, source) in read_rust_sources(path) {
            for (idx, line) in source.lines().enumerate() {
                if unwrap_after_get.is_match(line) {
                    findings.push(Finding {
                        title: "Unchecked storage read".to_string(),
                        severity: "medium".to_string(),
                        description: "Calling `.unwrap()` directly on a storage `get()` \
                             panics if the key is missing. Prefer matching on the \
                             `Option`/`Result`, or use `.unwrap_or(...)`."
                            .to_string(),
                        file: Some(file.display().to_string()),
                        line: Some(idx + 1),
                        source: "storage_safety".to_string(),
                    });
                }
            }
        }

        Ok(findings)
    }
}
