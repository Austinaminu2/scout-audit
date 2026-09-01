use std::path::PathBuf;

use anyhow::Result;

use crate::analyzer::Analyzer;
use crate::reporter::html;

pub async fn run(path: PathBuf, with_gas: bool) -> Result<()> {
    let analyzer = Analyzer::new();
    let report = analyzer.full_report(&path, with_gas).await?;
    html::write(&report, None)?;
    Ok(())
}
