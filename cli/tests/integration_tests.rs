use std::collections::HashSet;
use std::path::{Path, PathBuf};

use soroban_audit_prep::analyzer::linter::Linter;
use soroban_audit_prep::utils::scoring;

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/sample_contracts")
        .join(name)
}

#[test]
fn clean_contract_has_no_findings() {
    let linter = Linter::new();
    let findings = linter.check(&fixture("simple.rs")).expect("lint should succeed");

    assert!(
        findings.is_empty(),
        "expected no findings for simple.rs, got: {findings:#?}"
    );
}

#[test]
fn vulnerable_contract_trips_every_rule() {
    let linter = Linter::new();
    let findings = linter.check(&fixture("token.rs")).expect("lint should succeed");

    let sources: HashSet<_> = findings.iter().map(|f| f.source.as_str()).collect();

    for expected in [
        "auth_checks",
        "storage_safety",
        "arithmetic",
        "events",
        "ttl",
        "error_codes",
        "documentation",
    ] {
        assert!(
            sources.contains(expected),
            "expected a finding from rule '{expected}', got sources: {sources:?}"
        );
    }
}

#[test]
fn clean_contract_is_ready_for_audit() {
    let linter = Linter::new();
    let findings = linter.check(&fixture("simple.rs")).expect("lint should succeed");

    let score = scoring::calculate_score(&findings);
    assert!(
        scoring::is_ready_for_audit(score),
        "score {score} should be ready for audit"
    );
}

#[test]
fn vulnerable_contract_is_not_ready_for_audit() {
    let linter = Linter::new();
    let findings = linter.check(&fixture("token.rs")).expect("lint should succeed");

    let score = scoring::calculate_score(&findings);
    assert!(
        !scoring::is_ready_for_audit(score),
        "score {score} should not be ready for audit"
    );
}
