use std::path::Path;

use anyhow::Result;

use crate::models::AuditReport;

pub fn write(report: &AuditReport, output_path: Option<&Path>) -> Result<()> {
    let json = serde_json::to_string_pretty(report)?;

    match output_path {
        Some(path) => {
            std::fs::write(path, json)?;
            println!("Report saved to {}", path.display());
        }
        None => println!("{json}"),
    }

    Ok(())
}
