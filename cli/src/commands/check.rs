use std::path::PathBuf;

use anyhow::Result;

use crate::analyzer::linter::Linter;
use crate::reporter;

pub fn run(path: PathBuf, format: String) -> Result<()> {
    let linter = Linter::new();
    let findings = linter.check(&path)?;
    reporter::output_findings(&findings, &format)?;
    Ok(())
}
