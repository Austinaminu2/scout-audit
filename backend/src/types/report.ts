export interface Finding {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  file?: string;
  line?: number;
  source: string;
}

export interface GasProfile {
  function_costs: Record<string, number>;
  total_operations: number;
  estimated_max: number;
}

export interface AuditReport {
  findings: Finding[];
  // The CLI returns null when gas profiling wasn't run or possible — it
  // needs a compiled .wasm, not Rust source, which is the common input.
  gas_profile: GasProfile | null;
  score: number;
  ready_for_audit: boolean;
  timestamp: string;
}
