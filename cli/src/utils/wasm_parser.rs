use std::collections::HashMap;
use std::path::Path;

use anyhow::{Context, Result};
use walrus::ir::{dfs_in_order, Instr, InstrLocId, Visitor};
use walrus::Module;

// Heuristic instruction weights, loosely modeled on the *relative* cost of
// Soroban host operations: storage/memory access and calls dominate real
// gas usage, arithmetic and control flow are comparatively cheap. This is
// NOT the actual metered cost the Soroban host would charge for a call --
// that depends on the host's cost table and runtime inputs (bytes read or
// written, ledger state) that aren't knowable from static WASM alone.
// Treat these numbers as a relative signal for "which functions are
// gas-heavy," not an exact gas quote.
const WEIGHT_CALL: u64 = 50;
const WEIGHT_MEMORY: u64 = 20;
const WEIGHT_CONTROL_FLOW: u64 = 2;
const WEIGHT_DEFAULT: u64 = 1;

/// Heuristic instruction-weighted cost for each exported function in a
/// compiled wasm module, keyed by export name. Functions with no export
/// (internal helpers) are skipped -- they aren't part of the contract's
/// public interface.
pub fn estimate_function_costs(wasm_path: &Path) -> Result<HashMap<String, u64>> {
    let module = Module::from_file(wasm_path)
        .with_context(|| format!("failed to parse wasm module at {}", wasm_path.display()))?;

    let mut costs = HashMap::new();

    for (func_id, local_func) in module.funcs.iter_local() {
        let Some(export) = module.exports.get_exported_func(func_id) else {
            continue;
        };

        let mut visitor = CostVisitor::default();
        dfs_in_order(&mut visitor, local_func, local_func.entry_block());

        costs.insert(export.name.clone(), visitor.cost);
    }

    Ok(costs)
}

#[derive(Default)]
struct CostVisitor {
    cost: u64,
}

impl<'instr> Visitor<'instr> for CostVisitor {
    fn visit_instr(&mut self, instr: &'instr Instr, _instr_loc: &'instr InstrLocId) {
        self.cost += match instr {
            Instr::Call { .. } | Instr::CallIndirect { .. } => WEIGHT_CALL,
            Instr::Load { .. }
            | Instr::Store { .. }
            | Instr::MemorySize { .. }
            | Instr::MemoryGrow { .. }
            | Instr::MemoryInit { .. }
            | Instr::MemoryCopy { .. }
            | Instr::MemoryFill { .. } => WEIGHT_MEMORY,
            Instr::Block { .. }
            | Instr::Loop { .. }
            | Instr::IfElse { .. }
            | Instr::Br { .. }
            | Instr::BrIf { .. }
            | Instr::BrTable { .. } => WEIGHT_CONTROL_FLOW,
            _ => WEIGHT_DEFAULT,
        };
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use walrus::{FunctionBuilder, Module, ModuleConfig};

    #[test]
    fn calls_are_weighted_higher_than_baseline_ops() {
        let mut module = Module::with_config(ModuleConfig::default());

        // `light`: just a constant + drop (baseline-weight instructions).
        let mut light_builder = FunctionBuilder::new(&mut module.types, &[], &[]);
        light_builder.name("light".to_string());
        light_builder.func_body().i32_const(1).drop();
        let light_id = light_builder.finish(vec![], &mut module.funcs);
        module.exports.add("light", light_id);

        // `heavy`: calls `light` a few times, so it should cost more.
        let mut heavy_builder = FunctionBuilder::new(&mut module.types, &[], &[]);
        heavy_builder.name("heavy".to_string());
        {
            let mut body = heavy_builder.func_body();
            body.call(light_id).call(light_id).call(light_id);
        }
        let heavy_id = heavy_builder.finish(vec![], &mut module.funcs);
        module.exports.add("heavy", heavy_id);

        let wasm_bytes = module.emit_wasm();
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("test.wasm");
        std::fs::write(&path, wasm_bytes).expect("write wasm");

        let costs = estimate_function_costs(&path).expect("estimate costs");

        assert!(costs["heavy"] > costs["light"]);
        assert_eq!(costs["light"], WEIGHT_DEFAULT * 2); // i32.const + drop
        assert_eq!(costs["heavy"], WEIGHT_CALL * 3);
    }

    #[test]
    fn ignores_functions_with_no_wasm_extension() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("contract.rs");
        std::fs::write(&path, "// not wasm").expect("write");

        // estimate_function_costs is only ever called by GasProfiler after
        // it has already checked the extension, but make sure a bogus wasm
        // parse fails loudly instead of silently returning nonsense.
        assert!(estimate_function_costs(&path).is_err());
    }
}
