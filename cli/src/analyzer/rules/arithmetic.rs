use std::path::Path;

use anyhow::Result;
use regex::Regex;

use crate::models::Finding;

use super::{read_rust_sources, Rule};

/// Identifiers that commonly represent token amounts/balances, where an
/// overflow or underflow has real financial consequences.
const SENSITIVE_IDENTIFIERS: &[&str] = &["balance", "amount", "supply", "total"];

/// This is a text heuristic, not a data-flow analysis: it flags lines that
/// *look* like unchecked arithmetic on a balance-like value. It will both
/// miss real issues (arithmetic hidden behind a helper function) and flag
/// safe code (a comment or string containing "amount"). Treat findings as
/// leads to check manually, not confirmed bugs -- hence "medium" rather
/// than "high" severity.
pub struct ArithmeticSafety;

impl Rule for ArithmeticSafety {
    fn name(&self) -> &'static str {
        "arithmetic_safety"
    }

    fn check(&self, path: &Path) -> Result<Vec<Finding>> {
        let raw_op = Regex::new(r"[A-Za-z0-9_]\s*[+\-*]=?\s*[A-Za-z0-9_(]").expect("valid regex");

        let mut findings = Vec::new();

        for (file, source) in read_rust_sources(path) {
            for (idx, line) in source.lines().enumerate() {
                let lower = line.to_lowercase();
                let mentions_sensitive_value =
                    SENSITIVE_IDENTIFIERS.iter().any(|id| lower.contains(id));
                let uses_checked_math = lower.contains("checked_")
                    || lower.contains("saturating_")
                    || lower.contains("wrapping_");

                if mentions_sensitive_value && !uses_checked_math && raw_op.is_match(line) {
                    findings.push(Finding {
                        title: "Potential unchecked arithmetic".to_string(),
                        severity: "medium".to_string(),
                        description: format!(
                            "Line references a balance/amount-like value using a raw \
                             arithmetic operator. Consider `checked_add`/`checked_sub`/\
                             `checked_mul` (or saturating variants) to guard against \
                             overflow/underflow: `{}`",
                            line.trim()
                        ),
                        file: Some(file.display().to_string()),
                        line: Some(idx + 1),
                        source: "arithmetic".to_string(),
                    });
                }
            }
        }

        Ok(findings)
    }
}
