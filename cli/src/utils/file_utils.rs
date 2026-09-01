use std::path::{Path, PathBuf};

use walkdir::WalkDir;

/// Collects every `.rs` file under `path`. If `path` is itself a `.rs`
/// file, returns just that file.
pub fn collect_rust_files(path: &Path) -> Vec<PathBuf> {
    if path.is_file() {
        return vec![path.to_path_buf()];
    }

    WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .map(|entry| entry.into_path())
        .filter(|p| p.extension().and_then(|e| e.to_str()) == Some("rs"))
        .collect()
}

/// True if `path` (a file or directory) is part of a Cargo package, i.e. it
/// or one of its ancestors has a `Cargo.toml`. Scout analyzes a crate, not
/// a bare file, so running it against a `.rs` file with no crate context
/// just produces a confusing error -- callers use this to skip Scout
/// cleanly instead.
pub fn is_cargo_project(path: &Path) -> bool {
    let start = if path.is_dir() {
        path
    } else {
        path.parent().unwrap_or(path)
    };

    start.ancestors().any(|dir| dir.join("Cargo.toml").is_file())
}
