use std::path::PathBuf;

use clap::{Parser, Subcommand};

use soroban_audit_prep::commands;

#[derive(Parser)]
#[command(name = "audit-prep")]
#[command(about = "Soroban contract audit preparation tool")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Scan a contract for all issues (Scout + linter + gas profiling)
    Scan {
        /// Path to a contract source file, Cargo project directory, or compiled .wasm
        #[arg(value_name = "PATH")]
        path: PathBuf,

        /// Output format: text, json, or html
        #[arg(short, long, default_value = "text")]
        format: String,

        /// Save output to a file instead of stdout
        #[arg(short, long)]
        output: Option<PathBuf>,

        /// Exit with a non-zero status if the audit score is below this threshold (useful in CI)
        #[arg(long, value_name = "SCORE")]
        fail_under: Option<u32>,
    },

    /// Run only the custom linter rules (no Scout, no gas profiling)
    Check {
        #[arg(value_name = "PATH")]
        path: PathBuf,

        /// Output format: text or json
        #[arg(short, long, default_value = "text")]
        format: String,
    },

    /// Generate a full HTML audit report
    Report {
        #[arg(value_name = "PATH")]
        path: PathBuf,

        /// Include gas profiling (requires a compiled .wasm)
        #[arg(long)]
        with_gas: bool,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Scan { path, format, output, fail_under } => {
            commands::scan::run(path, format, output, fail_under).await
        }
        Commands::Check { path, format } => commands::check::run(path, format),
        Commands::Report { path, with_gas } => commands::report::run(path, with_gas).await,
    }
}
