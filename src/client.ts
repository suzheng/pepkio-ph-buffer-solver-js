// SPDX-License-Identifier: MIT
import {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  resolveApiKey,
  resolveBaseUrl,
} from "./config.js";
import {
  parseRunInput,
  type ConcUnit,
  type CustomBufferInfo,
  type PHBufferSolverInput,
  type ReagentMode,
  type Titrant,
  type VolumeUnit,
} from "./schemas.js";
import {
  PepkioAPIError,
  type ExampleMeta,
  type PHBufferSolverResult,
  type RunOptions,
  type RunResult,
  type ToolManifest,
} from "./types.js";

export interface PepkioClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

export interface SolveReverseOptions {
  bufferId: string;
  targetPh: number;
  totalConcentration: number;
  concentrationUnit?: ConcUnit;
  finalVolume: number;
  volumeUnit?: VolumeUnit;
  temperatureC?: number;
  reagentMode?: ReagentMode;
  titrant?: Titrant;
  customBuffer?: CustomBufferInfo;
  stockAcidM?: number;
  stockBaseM?: number;
  titrantStockM?: number;
}

export interface SolveForwardOptions {
  bufferId: string;
  moleRatio: number;
  totalConcentration?: number;
  concentrationUnit?: ConcUnit;
  finalVolume?: number;
  volumeUnit?: VolumeUnit;
  temperatureC?: number;
  reagentMode?: ReagentMode;
  customBuffer?: CustomBufferInfo;
}

export class PepkioClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private manifestCache: ToolManifest | undefined;

  constructor(opts: PepkioClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(opts.baseUrl);
    this.apiKey = resolveApiKey(this.baseUrl, opts.apiKey);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async getManifest(opts: { refresh?: boolean } = {}): Promise<ToolManifest> {
    if (this.manifestCache && !opts.refresh) {
      return this.manifestCache;
    }
    const manifest = await this.request<ToolManifest>(
      "GET",
      `/tools/${TOOL_ID}/manifest`,
      undefined,
      { requireAuth: false },
    );
    this.manifestCache = manifest;
    return manifest;
  }

  listExamples(manifest?: ToolManifest): ExampleMeta[] {
    const m = manifest ?? this.manifestCache;
    if (!m?.examples) {
      return [];
    }
    return m.examples.map((e) => ({
      name: e.name,
      description: e.description,
    }));
  }

  async getExamples(manifest?: ToolManifest): Promise<ExampleMeta[]> {
    const m = manifest ?? (await this.getManifest());
    return this.listExamples(m);
  }

  async getExampleInput(
    name: string,
    manifest?: ToolManifest,
  ): Promise<PHBufferSolverInput> {
    const m = manifest ?? (await this.getManifest());
    const example = m.examples?.find((e) => e.name === name);
    if (!example) {
      const available = m.examples?.map((e) => e.name).join(", ") ?? "(none)";
      throw new Error(`Example "${name}" not found. Available: ${available}`);
    }
    return parseRunInput(example.input);
  }

  async run(
    input: PHBufferSolverInput,
    options?: RunOptions,
  ): Promise<RunResult<PHBufferSolverResult>> {
    const validated = parseRunInput(input);
    return this.request<RunResult<PHBufferSolverResult>>(
      "POST",
      `/tools/${TOOL_ID}/run`,
      { input: validated, options: options ?? {} },
      { requireAuth: true },
    );
  }

  /**
   * Convenience helper to solve reverse mode (target pH -> buffer recipe and capacity).
   */
  async solveReverse(
    params: SolveReverseOptions,
    options?: RunOptions,
  ): Promise<RunResult<PHBufferSolverResult>> {
    const input: PHBufferSolverInput = {
      tab: "solver",
      solve_direction: "reverse",
      buffer_id: params.bufferId,
      target_ph: params.targetPh,
      total_concentration: params.totalConcentration,
      concentration_unit: params.concentrationUnit ?? "mM",
      final_volume: params.finalVolume,
      volume_unit: params.volumeUnit ?? "mL",
    };
    if (params.temperatureC !== undefined) input.temperature_c = params.temperatureC;
    if (params.reagentMode !== undefined) input.reagent_mode = params.reagentMode;
    if (params.titrant !== undefined) input.titrant = params.titrant;
    if (params.customBuffer !== undefined) input.custom_buffer = params.customBuffer;
    if (params.stockAcidM !== undefined) input.stock_acid_M = params.stockAcidM;
    if (params.stockBaseM !== undefined) input.stock_base_M = params.stockBaseM;
    if (params.titrantStockM !== undefined) input.titrant_stock_M = params.titrantStockM;
    return this.run(input, options);
  }

  /**
   * Convenience helper to solve forward mode (mole ratio -> solution pH and capacity).
   */
  async solveForward(
    params: SolveForwardOptions,
    options?: RunOptions,
  ): Promise<RunResult<PHBufferSolverResult>> {
    const input: PHBufferSolverInput = {
      tab: "solver",
      solve_direction: "forward",
      buffer_id: params.bufferId,
      mole_ratio: params.moleRatio,
    };
    if (params.totalConcentration !== undefined) {
      input.total_concentration = params.totalConcentration;
    }
    if (params.concentrationUnit !== undefined) {
      input.concentration_unit = params.concentrationUnit;
    }
    if (params.finalVolume !== undefined) {
      input.final_volume = params.finalVolume;
    }
    if (params.volumeUnit !== undefined) {
      input.volume_unit = params.volumeUnit;
    }
    if (params.temperatureC !== undefined) {
      input.temperature_c = params.temperatureC;
    }
    if (params.reagentMode !== undefined) {
      input.reagent_mode = params.reagentMode;
    }
    if (params.customBuffer !== undefined) {
      input.custom_buffer = params.customBuffer;
    }
    return this.run(input, options);
  }

  /**
   * Convenience helper to retrieve the cited biological buffer pKa reference library.
   */
  async getPKALibrary(options?: RunOptions): Promise<RunResult<PHBufferSolverResult>> {
    const input: PHBufferSolverInput = {
      tab: "pka-reference",
    };
    return this.run(input, options);
  }

  async getRun(runId: string): Promise<RunResult<PHBufferSolverResult>> {
    return this.request<RunResult<PHBufferSolverResult>>(
      "GET",
      `/runs/${runId}`,
      undefined,
      { requireAuth: true },
    );
  }

  async waitForRun(
    runId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<RunResult<PHBufferSolverResult>> {
    const intervalMs = opts.intervalMs ?? 1000;
    const timeoutMs = opts.timeoutMs ?? 30_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.getRun(runId);
      if (result.status === "completed" || result.status === "failed") {
        if (result.error) {
          const errMsg =
            typeof result.error === "string"
              ? result.error
              : typeof result.error === "object" &&
                  result.error !== null &&
                  "message" in result.error
                ? (result.error as { message: string }).message
                : JSON.stringify(result.error);
          throw new PepkioAPIError(errMsg, {
            status: 200,
            body: result,
            runId,
          });
        }
        return result;
      }
      await sleep(intervalMs);
    }

    throw new PepkioAPIError(`Timed out waiting for run ${runId}`, {
      status: 408,
      runId,
    });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { requireAuth?: boolean } = {},
  ): Promise<T> {
    const requireAuth = opts.requireAuth ?? false;
    if (requireAuth && !this.apiKey) {
      throw new PepkioAPIError(
        "API key required. Set PEPKIO_API_KEY (or LOCAL_PEPKIO_API_KEY for local dev).",
        { status: 401 },
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const url = apiPath(this.baseUrl, path);
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let parsed: unknown;
    const text = await response.text();
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      let code: string | undefined;
      if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
        const errVal = (parsed as { error: unknown }).error;
        if (typeof errVal === "string") {
          message = errVal;
        } else if (typeof errVal === "object" && errVal !== null) {
          if (
            "message" in errVal &&
            typeof (errVal as { message: unknown }).message === "string"
          ) {
            message = (errVal as { message: string }).message;
          }
          if (
            "code" in errVal &&
            typeof (errVal as { code: unknown }).code === "string"
          ) {
            code = (errVal as { code: string }).code;
          }
        }
      }
      throw new PepkioAPIError(message, {
        status: response.status,
        body: parsed,
        code,
      });
    }

    const runResult = parsed as RunResult<PHBufferSolverResult>;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      runResult.error
    ) {
      const errMsg =
        typeof runResult.error === "string"
          ? runResult.error
          : typeof runResult.error === "object" &&
              runResult.error !== null &&
              "message" in runResult.error
            ? (runResult.error as { message: string }).message
            : JSON.stringify(runResult.error);
      throw new PepkioAPIError(errMsg, {
        status: response.status,
        body: parsed,
        runId: runResult.run_id,
      });
    }

    return parsed as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
