use std::path::Path;

use anyhow::Result;
use regex::Regex;

use crate::models::Finding;

use super::{line_index_at, read_rust_sources, Rule};

pub struct Documentation;

impl Rule for Documentation {
    fn name(&self) -> &'static str {
        "documentation"
    }

    fn check(&self, path: &Path) -> Result<Vec<Finding>> {
        let fn_re = Regex::new(r"pub\s+fn\s+([A-Za-z_][A-Za-z0-9_]*)").expect("valid regex");

        let mut findings = Vec::new();

        for (file, source) in read_rust_sources(path) {
            let lines: Vec<&str> = source.lines().collect();

            for cap in fn_re.captures_iter(&source) {
                let whole = cap.get(0).unwrap();
                let name = &cap[1];
                // 0-based index of the line the `pub fn` starts on.
                let line_idx = line_index_at(&source, whole.start());

                let has_doc_comment = line_idx > 0
                    && lines[..line_idx]
                        .iter()
                        .rev()
                        .take_while(|l| {
                            let t = l.trim();
                            t.starts_with("///") || t.starts_with("#[") || t.is_empty()
                        })
                        .any(|l| l.trim().starts_with("///"));

                if !has_doc_comment {
                    findings.push(Finding {
                        title: "Undocumented public function".to_string(),
                        severity: "info".to_string(),
                        description: format!(
                            "`{name}` is public but has no `///` doc comment. Auditors move \
                             faster through documented interfaces."
                        ),
                        file: Some(file.display().to_string()),
                        line: Some(line_idx + 1),
                        source: "documentation".to_string(),
                    });
                }
            }
        }

        Ok(findings)
    }
}
