use crate::config;
use crate::models::Finding;

pub fn calculate_score(findings: &[Finding]) -> u32 {
    let mut score = 100u32;

    let critical = findings.iter().filter(|f| f.severity == "critical").count() as u32;
    let high = findings.iter().filter(|f| f.severity == "high").count() as u32;
    let medium = findings.iter().filter(|f| f.severity == "medium").count() as u32;

    score = score.saturating_sub(critical * config::SEVERITY_WEIGHT_CRITICAL);
    score = score.saturating_sub(high * config::SEVERITY_WEIGHT_HIGH);
    score = score.saturating_sub(medium * config::SEVERITY_WEIGHT_MEDIUM);

    score
}

pub fn is_ready_for_audit(score: u32) -> bool {
    score >= config::SCORE_THRESHOLD_READY
}
