pub mod gas_profiler;
pub mod linter;
pub mod rules;
pub mod scout;

use std::path::Path;

use anyhow::Result;
use chrono::Utc;

use crate::models::AuditReport;
use crate::utils::scoring;

pub struct Analyzer {
    scout: scout::ScoutRunner,
    linter: linter::Linter,
    gas: gas_profiler::GasProfiler,
}

impl Analyzer {
    pub fn new() -> Self {
        Self {
            scout: scout::ScoutRunner::new(),
            linter: linter::Linter::new(),
            gas: gas_profiler::GasProfiler::new(),
        }
    }

    /// Runs Scout + the custom linter + gas profiling.
    pub async fn scan(&self, path: &Path) -> Result<AuditReport> {
        self.run(path, true).await
    }

    /// Runs Scout + the custom linter, and gas profiling only when
    /// `with_gas` is true.
    pub async fn full_report(&self, path: &Path, with_gas: bool) -> Result<AuditReport> {
        self.run(path, with_gas).await
    }

    async fn run(&self, path: &Path, with_gas: bool) -> Result<AuditReport> {
        let mut findings = Vec::new();

        // Progress lines go to stderr, not stdout: `--format json`/`html`
        // write the report to stdout, and callers like the backend's
        // auditService do a bare JSON.parse on stdout. Anything printed to
        // stdout here would corrupt that payload.
        match self.scout.run(path).await {
            Ok(scout_findings) => {
                eprintln!("Scout analysis complete ({} findings)", scout_findings.len());
                findings.extend(scout_findings);
            }
            Err(e) => eprintln!("Scout failed: {e}"),
        }

        match self.linter.check(path) {
            Ok(linter_findings) => {
                eprintln!("Linter checks complete ({} findings)", linter_findings.len());
                findings.extend(linter_findings);
            }
            Err(e) => eprintln!("Linter failed: {e}"),
        }

        let gas_profile = if with_gas {
            match self.gas.profile(path) {
                Ok(profile) => {
                    if profile.is_some() {
                        eprintln!("Gas profiling complete");
                    }
                    profile
                }
                Err(e) => {
                    eprintln!("Gas profiling failed: {e}");
                    None
                }
            }
        } else {
            None
        };

        let score = scoring::calculate_score(&findings);
        let ready_for_audit = scoring::is_ready_for_audit(score);

        Ok(AuditReport {
            findings,
            gas_profile,
            score,
            ready_for_audit,
            timestamp: Utc::now(),
        })
    }
}

impl Default for Analyzer {
    fn default() -> Self {
        Self::new()
    }
}
