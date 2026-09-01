use std::path::Path;
use std::time::Duration;

use anyhow::{bail, Context, Result};
use tokio::process::Command;
use tokio::time::timeout;

use crate::config;
use crate::models::Finding;
use crate::utils::file_utils::is_cargo_project;

pub struct ScoutRunner;

impl ScoutRunner {
    pub fn new() -> Self {
        Self
    }

    /// Runs the Scout static analyzer (`cargo-scout-audit`) against
    /// `contract_path`. Scout analyzes a Cargo package's source, so this is
    /// a no-op (not an error) when `contract_path` isn't part of a Cargo
    /// project -- e.g. a bare `.rs` file or a compiled `.wasm`.
    pub async fn run(&self, contract_path: &Path) -> Result<Vec<Finding>> {
        if !is_cargo_project(contract_path) {
            eprintln!(
                "  (skipping Scout: {} is not part of a Cargo project)",
                contract_path.display()
            );
            return Ok(Vec::new());
        }

        if !self.is_installed().await {
            bail!("Scout not installed. Install with: cargo install cargo-scout-audit");
        }

        let output = timeout(
            Duration::from_secs(config::SCOUT_TIMEOUT_SECS),
            Command::new("scout")
                .arg("check")
                .arg(contract_path)
                .arg("--output-format")
                .arg("json")
                .output(),
        )
        .await
        .context("Scout timed out")??;

        if !output.status.success() {
            bail!(String::from_utf8_lossy(&output.stderr).into_owned());
        }

        let json_str = String::from_utf8(output.stdout)?;
        self.parse_output(&json_str)
    }

    async fn is_installed(&self) -> bool {
        Command::new("scout").arg("--version").output().await.is_ok()
    }

    fn parse_output(&self, json: &str) -> Result<Vec<Finding>> {
        let parsed: serde_json::Value = serde_json::from_str(json)?;

        let findings = parsed["findings"]
            .as_array()
            .cloned()
            .unwrap_or_default()
            .iter()
            .map(|f| Finding {
                title: f["title"].as_str().unwrap_or("Unknown").to_string(),
                severity: f["severity"].as_str().unwrap_or("medium").to_string(),
                description: f["description"].as_str().unwrap_or("").to_string(),
                file: f["file"].as_str().map(|s| s.to_string()),
                line: f["line"].as_u64().map(|n| n as usize),
                source: "scout".to_string(),
            })
            .collect();

        Ok(findings)
    }
}

impl Default for ScoutRunner {
    fn default() -> Self {
        Self::new()
    }
}
