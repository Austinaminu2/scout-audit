pub mod html;
pub mod json;

use std::path::Path;

use anyhow::Result;

use crate::models::{AuditReport, Finding};

pub fn output(report: &AuditReport, format: &str, output_path: Option<&Path>) -> Result<()> {
    match format {
        "json" => json::write(report, output_path)?,
        "html" => html::write(report, output_path)?,
        _ => println!("{}", format_text(report)),
    }
    Ok(())
}

pub fn output_findings(findings: &[Finding], format: &str) -> Result<()> {
    match format {
        "json" => println!("{}", serde_json::to_string_pretty(findings)?),
        _ => {
            if findings.is_empty() {
                println!("No issues found.");
            }
            for finding in findings {
                let location = match (&finding.file, finding.line) {
                    (Some(file), Some(line)) => format!(" ({file}:{line})"),
                    (Some(file), None) => format!(" ({file})"),
                    _ => String::new(),
                };
                println!(
                    "[{}] {}{}\n  {}\n",
                    finding.severity.to_uppercase(),
                    finding.title,
                    location,
                    finding.description
                );
            }
        }
    }
    Ok(())
}

fn count(findings: &[Finding], severity: &str) -> usize {
    findings.iter().filter(|f| f.severity == severity).count()
}

fn format_text(report: &AuditReport) -> String {
    let gas_summary = match &report.gas_profile {
        Some(profile) => format!(
            "  - Functions analyzed: {}\n  - Max estimated relative cost: {}",
            profile.total_operations, profile.estimated_max
        ),
        None => "  - Not available (requires a compiled .wasm contract)".to_string(),
    };

    format!(
        "\n\
         ==========================================\n\
         SOROBAN AUDIT PREP REPORT\n\
         ==========================================\n\n\
         SCORE: {}/100\n\
         Ready for Audit: {}\n\n\
         FINDINGS: {}\n\
         - Critical: {}\n\
         - High: {}\n\
         - Medium: {}\n\
         - Low: {}\n\
         - Info: {}\n\n\
         GAS PROFILE:\n\
         {}\n\n\
         Generated: {}\n",
        report.score,
        if report.ready_for_audit { "YES" } else { "NO" },
        report.findings.len(),
        count(&report.findings, "critical"),
        count(&report.findings, "high"),
        count(&report.findings, "medium"),
        count(&report.findings, "low"),
        count(&report.findings, "info"),
        gas_summary,
        report.timestamp,
    )
}
