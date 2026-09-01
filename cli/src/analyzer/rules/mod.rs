pub mod arithmetic;
pub mod auth_checks;
pub mod documentation;
pub mod error_codes;
pub mod events;
pub mod storage_safety;
pub mod ttl;

use std::path::{Path, PathBuf};

use anyhow::Result;
use regex::Regex;

use crate::models::Finding;
use crate::utils::file_utils::collect_rust_files;

pub trait Rule {
    fn name(&self) -> &'static str;
    fn check(&self, path: &Path) -> Result<Vec<Finding>>;
}

/// Reads every `.rs` file under `path` (or just `path` if it's a single
/// file) as UTF-8 text. Files that can't be read as UTF-8 are skipped
/// rather than failing the whole scan.
pub fn read_rust_sources(path: &Path) -> Vec<(PathBuf, String)> {
    collect_rust_files(path)
        .into_iter()
        .filter_map(|file| std::fs::read_to_string(&file).ok().map(|src| (file, src)))
        .collect()
}

/// Returns the 0-based index of the line containing byte offset `pos` in
/// `source`. Counting `\n` bytes (rather than `source[..pos].lines().count()`)
/// avoids an off-by-one when `pos` falls in the middle of a line: `.lines()`
/// would count that partial, non-empty prefix as an extra line.
pub fn line_index_at(source: &str, pos: usize) -> usize {
    source[..pos].matches('\n').count()
}

pub struct FnSpan {
    pub name: String,
    pub start_line: usize,
    pub body: String,
}

/// Extracts each `pub fn` in `source` along with its body, using brace
/// counting rather than a full parser. This is a lightweight heuristic --
/// good enough to ask "does this function call X" for a handful of
/// pattern-based lint rules, not a substitute for real Rust parsing (Scout
/// covers that ground).
pub fn extract_pub_fns(source: &str) -> Vec<FnSpan> {
    let fn_re = Regex::new(r"pub\s+fn\s+([A-Za-z_][A-Za-z0-9_]*)").expect("valid regex");
    let bytes = source.as_bytes();
    let mut spans = Vec::new();

    for cap in fn_re.captures_iter(source) {
        let whole = cap.get(0).unwrap();
        let name = cap[1].to_string();
        let start_line = line_index_at(source, whole.start()) + 1;

        let Some(rel_open) = source[whole.end()..].find('{') else {
            continue;
        };
        let open = whole.end() + rel_open;

        let mut depth = 0i32;
        let mut end = None;
        for (i, byte) in bytes[open..].iter().enumerate() {
            match *byte as char {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        end = Some(open + i + 1);
                        break;
                    }
                }
                _ => {}
            }
        }

        let Some(end) = end else { continue };
        spans.push(FnSpan {
            name,
            start_line,
            body: source[open..end].to_string(),
        });
    }

    spans
}
