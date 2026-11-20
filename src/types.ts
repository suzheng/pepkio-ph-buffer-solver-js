// SPDX-License-Identifier: MIT
import type {
  ConcUnit,
  CustomBufferInfo,
  PHBufferSolverInput,
  ReagentMode,
  SolveDirection,
  Tab,
  Titrant,
  VolumeUnit,
} from "./schemas.js";

export type {
  ConcUnit,
  CustomBufferInfo,
  PHBufferSolverInput,
  ReagentMode,
  SolveDirection,
  Tab,
  Titrant,
  VolumeUnit,
};

export type RunStatus = "queued" | "running" | "completed" | "failed" | (string & {});

export interface RunOptions {
  idempotency_key?: string;
  label?: string;
  [key: string]: unknown;
}

export interface ManifestExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolManifest {
  schema_version: string;
  tool_id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  execution_mode?: string;
  estimated_runtime_sec?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  agent_notes?: string;
  example_prompts?: string[];
  examples?: ManifestExample[];
  limits?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
}

export interface ExampleMeta {
  name: string;
  description?: string;
}

export interface BufferRecipeComponent {
  name?: string;
  mass_g?: number;
  volume_mL?: number;
  concentration?: number;
  concentration_unit?: string;
  [key: string]: unknown;
}

export interface BufferRecipe {
  mode?: string;
  description?: string;
  acid?: BufferRecipeComponent;
  base?: BufferRecipeComponent;
  titrant?: BufferRecipeComponent;
  instructions?: string[];
  [key: string]: unknown;
}

export interface SolverResult {
  solve_direction?: "forward" | "reverse" | string;
  buffer_label?: string;
  pKa_effective?: number;
  temperature_c?: number;
  target_ph?: number;
  ph?: number;
  mole_ratio?: number;
  acid_fraction?: number;
  base_fraction?: number;
  total_concentration_mM?: number;
  final_volume_L?: number;
  buffer_capacity_mM_per_pH?: number;
  recipe?: BufferRecipe;
  [key: string]: unknown;
}

export interface PKABufferEntry {
  id: string;
  label: string;
  pKa_25C: number;
  dpKa_dT: number;
  source: string;
  note?: string;
  [key: string]: unknown;
}

export interface PKALibraryResult {
  buffers: PKABufferEntry[];
  [key: string]: unknown;
}

export interface PHBufferSolverResult {
  tab: string;
  solver?: SolverResult;
  library?: PKALibraryResult;
  warnings?: Array<string | { field?: string; message: string; level?: string }>;
  error?: string;
  [key: string]: unknown;
}

export interface RunResult<T = PHBufferSolverResult> {
  run_id: string;
  status: RunStatus;
  result?: T;
  error?: string | { code?: string; message: string; details?: unknown } | null;
  duration_ms?: number;
  result_url?: string;
  permalink?: string;
}

export class PepkioAPIError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly runId?: string;
  readonly body?: unknown;

  constructor(
    message: string,
    opts: {
      status?: number;
      code?: string;
      runId?: string;
      body?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "PepkioAPIError";
    this.status = opts.status;
    this.code = opts.code;
    this.runId = opts.runId;
    this.body = opts.body;
  }
}
