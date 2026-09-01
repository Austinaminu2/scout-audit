use std::collections::HashMap;
use std::path::Path;

use anyhow::Result;
use regex::Regex;

use crate::models::Finding;

use super::{line_index_at, read_rust_sources, Rule};

pub struct ErrorCodeConsistency;

impl Rule for ErrorCodeConsistency {
    fn name(&self) -> &'static str {
        "error_code_consistency"
    }

    fn check(&self, path: &Path) -> Result<Vec<Finding>> {
        let enum_re = Regex::new(r"(?s)#\[contracterror\][^{]*enum\s+(\w+)\s*\{([^}]*)\}")
            .expect("valid regex");
        let variant_re = Regex::new(r"(\w+)\s*=\s*(\d+)").expect("valid regex");

        let mut findings = Vec::new();

        for (file, source) in read_rust_sources(path) {
            for enum_cap in enum_re.captures_iter(&source) {
                let enum_name = &enum_cap[1];
                let body = &enum_cap[2];
                let enum_start = enum_cap.get(0).unwrap().start();

                let mut seen: HashMap<u64, String> = HashMap::new();
                for variant_cap in variant_re.captures_iter(body) {
                    let variant_name = variant_cap[1].to_string();
                    let Ok(code) = variant_cap[2].parse::<u64>() else {
                        continue;
                    };

                    if let Some(existing) = seen.get(&code) {
                        let line = line_index_at(&source, enum_start) + 1;
                        findings.push(Finding {
                            title: "Duplicate error code".to_string(),
                            severity: "medium".to_string(),
                            description: format!(
                                "`{enum_name}::{existing}` and `{enum_name}::{variant_name}` \
                                 share error code {code}. Callers can't distinguish between the \
                                 two failure cases."
                            ),
                            file: Some(file.display().to_string()),
                            line: Some(line),
                            source: "error_codes".to_string(),
                        });
                    } else {
                        seen.insert(code, variant_name);
                    }
                }
            }
        }

        Ok(findings)
    }
}
