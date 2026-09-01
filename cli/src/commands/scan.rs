use std::path::PathBuf;

use anyhow::Result;

use crate::analyzer::Analyzer;
use crate::reporter;

pub async fn run(
    path: PathBuf,
    format: String,
    output: Option<PathBuf>,
    fail_under: Option<u32>,
) -> Result<()> {
    let analyzer = Analyzer::new();
    let report = analyzer.scan(&path).await?;
    reporter::output(&report, &format, output.as_deref())?;

    if let Some(threshold) = fail_under
        && report.score < threshold
    {
        eprintln!(
            "Score {} is below the required threshold of {threshold}",
            report.score
        );
        std::process::exit(1);
    }

    Ok(())
}
