use std::path::Path;

use anyhow::Result;

use crate::models::{AuditReport, Finding};

pub fn write(report: &AuditReport, output_path: Option<&Path>) -> Result<()> {
    let html = render(report);

    match output_path {
        Some(path) => {
            std::fs::write(path, html)?;
            println!("Report saved to {}", path.display());
        }
        None => println!("{html}"),
    }

    Ok(())
}

fn render(report: &AuditReport) -> String {
    let rows: String = report
        .findings
        .iter()
        .map(render_finding_row)
        .collect::<Vec<_>>()
        .join("\n");
    let rows = if rows.is_empty() {
        "<tr><td colspan=\"5\">No issues found.</td></tr>".to_string()
    } else {
        rows
    };

    let gas_rows: String = match &report.gas_profile {
        Some(profile) => {
            let mut entries: Vec<_> = profile.function_costs.iter().collect();
            entries.sort_by(|a, b| b.1.cmp(a.1));
            entries
                .iter()
                .map(|(name, cost)| format!("<tr><td>{}</td><td>{cost}</td></tr>", escape(name)))
                .collect::<Vec<_>>()
                .join("\n")
        }
        None => {
            "<tr><td colspan=\"2\">Not available (requires a compiled .wasm contract)</td></tr>"
                .to_string()
        }
    };

    format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Soroban Audit Prep Report</title>
<style>
  body {{ font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; background: #fff; }}
  h1 {{ margin-bottom: 0; }}
  .score {{ font-size: 2rem; font-weight: bold; }}
  .ready-yes {{ color: #0a7d32; }}
  .ready-no {{ color: #b91c1c; }}
  table {{ border-collapse: collapse; width: 100%; margin-top: 1rem; }}
  th, td {{ border: 1px solid #ddd; padding: 0.5rem; text-align: left; vertical-align: top; }}
  th {{ background: #f5f5f5; }}
  .sev-critical {{ color: #b91c1c; font-weight: bold; }}
  .sev-high {{ color: #c2410c; font-weight: bold; }}
  .sev-medium {{ color: #a16207; }}
  .sev-low {{ color: #4d7c0f; }}
  .sev-info {{ color: #64748b; }}
</style>
</head>
<body>
  <h1>Soroban Audit Prep Report</h1>
  <p>Generated: {timestamp}</p>
  <p class="score">Score: {score}/100</p>
  <p class="{ready_class}">Ready for audit: {ready_text}</p>

  <h2>Findings ({finding_count})</h2>
  <table>
    <thead><tr><th>Severity</th><th>Title</th><th>Location</th><th>Description</th><th>Source</th></tr></thead>
    <tbody>
      {rows}
    </tbody>
  </table>

  <h2>Gas Profile</h2>
  <table>
    <thead><tr><th>Function</th><th>Estimated relative cost</th></tr></thead>
    <tbody>
      {gas_rows}
    </tbody>
  </table>
</body>
</html>
"#,
        timestamp = report.timestamp,
        score = report.score,
        ready_class = if report.ready_for_audit { "ready-yes" } else { "ready-no" },
        ready_text = if report.ready_for_audit { "YES" } else { "NO" },
        finding_count = report.findings.len(),
    )
}

fn render_finding_row(finding: &Finding) -> String {
    let location = match (&finding.file, finding.line) {
        (Some(file), Some(line)) => format!("{}:{line}", escape(file)),
        (Some(file), None) => escape(file),
        _ => "-".to_string(),
    };

    format!(
        "<tr><td class=\"sev-{sev}\">{sev_upper}</td><td>{title}</td><td>{location}</td><td>{description}</td><td>{source}</td></tr>",
        sev = finding.severity,
        sev_upper = finding.severity.to_uppercase(),
        title = escape(&finding.title),
        description = escape(&finding.description),
        source = escape(&finding.source),
    )
}

// Findings can embed text pulled from the audited contract itself (Scout
// output, source identifiers matched by our own regex rules) or from
// `--output` file paths. Since this HTML is meant to be opened in a
// browser, unescaped interpolation would let a maliciously crafted
// contract (or filename) inject markup/script into the report. Escape
// everything that isn't a value we generated ourselves.
fn escape(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
