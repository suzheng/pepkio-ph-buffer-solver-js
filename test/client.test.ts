// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PepkioClient } from "../src/client.js";
import {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  isLocalUrl,
  resolveApiKey,
  resolveBaseUrl,
} from "../src/config.js";
import { parseRunInput } from "../src/schemas.js";
import { PepkioAPIError } from "../src/types.js";

const MOCK_MANIFEST = {
  schema_version: "1.0",
  tool_id: TOOL_ID,
  title: "pH Buffer Solver",
  description: "Henderson–Hasselbalch buffer solver",
  execution_mode: "sync",
  examples: [
    {
      name: "phosphate_50mM_pH74",
      description: "50 mM phosphate buffer pH 7.4 in 100 mL at 25°C",
      input: {
        tab: "solver",
        solve_direction: "reverse",
        buffer_id: "phosphate",
        target_ph: 7.4,
        total_concentration: 50,
        concentration_unit: "mM",
        final_volume: 100,
        volume_unit: "mL",
        temperature_c: 25,
        reagent_mode: "solid_solid",
      },
      output: {
        solver: {
          target_ph: 7.4,
          buffer_capacity_mM_per_pH: 19.2,
        },
      },
    },
    {
      name: "tris_forward_ratio",
      description: "Tris with base:acid ratio 0.5",
      input: {
        tab: "solver",
        solve_direction: "forward",
        buffer_id: "tris",
        mole_ratio: 0.5,
        total_concentration: 50,
        concentration_unit: "mM",
        final_volume: 100,
        volume_unit: "mL",
        temperature_c: 25,
        reagent_mode: "solid_solid",
      },
    },
    {
      name: "pka_library",
      description: "Cited pKa reference library",
      input: {
        tab: "pka-reference",
      },
    },
  ],
};

const MOCK_RUN_RESULT = {
  run_id: "test-run-123",
  status: "completed",
  result: {
    tab: "solver",
    warnings: [],
    solver: {
      solve_direction: "reverse",
      buffer_label: "Sodium phosphate",
      target_ph: 7.4,
      buffer_capacity_mM_per_pH: 19.2,
      recipe: {
        mode: "solid_solid",
      },
    },
  },
  result_url: "https://tools.pepkio.com/api/tools/v1/runs/test-run-123",
  permalink: "https://tools.pepkio.com/r/test-run-123",
};

describe("config helpers", () => {
  it("resolves default baseUrl as production", () => {
    delete process.env.PEPKIO_API_BASE_URL;
    expect(resolveBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it("resolves baseUrl override stripping trailing slash", () => {
    expect(resolveBaseUrl("https://example.com/")).toBe("https://example.com");
  });

  it("identifies local URLs", () => {
    expect(isLocalUrl("https://tools.localtest.me")).toBe(true);
    expect(isLocalUrl("http://localhost:3000")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:8000")).toBe(true);
    expect(isLocalUrl("https://tools.pepkio.com")).toBe(false);
  });

  it("resolves apiKey precedence", () => {
    const origLocal = process.env.LOCAL_PEPKIO_API_KEY;
    const origProd = process.env.PEPKIO_API_KEY;

    process.env.LOCAL_PEPKIO_API_KEY = "local-secret";
    process.env.PEPKIO_API_KEY = "prod-secret";

    expect(resolveApiKey("https://tools.localtest.me")).toBe("local-secret");
    expect(resolveApiKey("https://tools.pepkio.com")).toBe("prod-secret");
    expect(resolveApiKey("https://tools.pepkio.com", "override-secret")).toBe(
      "override-secret",
    );

    if (origLocal !== undefined) process.env.LOCAL_PEPKIO_API_KEY = origLocal;
    else delete process.env.LOCAL_PEPKIO_API_KEY;
    if (origProd !== undefined) process.env.PEPKIO_API_KEY = origProd;
    else delete process.env.PEPKIO_API_KEY;
  });

  it("builds correct API path", () => {
    expect(apiPath("https://tools.pepkio.com", "/tools/ph-buffer-solver/manifest")).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/ph-buffer-solver/manifest",
    );
    expect(apiPath("https://tools.pepkio.com", "runs/123")).toBe(
      "https://tools.pepkio.com/api/tools/v1/runs/123",
    );
  });
});

describe("schemas", () => {
  it("parses valid reverse solver input", () => {
    const parsed = parseRunInput({
      tab: "solver",
      solve_direction: "reverse",
      buffer_id: "phosphate",
      target_ph: 7.4,
      total_concentration: 50,
      concentration_unit: "mM",
      final_volume: 100,
      volume_unit: "mL",
    });
    expect(parsed.tab).toBe("solver");
    expect(parsed.target_ph).toBe(7.4);
    expect(parsed.concentration_unit).toBe("mM");
  });

  it("parses valid forward solver input", () => {
    const parsed = parseRunInput({
      tab: "solver",
      solve_direction: "forward",
      buffer_id: "tris",
      mole_ratio: 0.5,
    });
    expect(parsed.solve_direction).toBe("forward");
    expect(parsed.mole_ratio).toBe(0.5);
  });

  it("parses valid pka-reference input", () => {
    const parsed = parseRunInput({
      tab: "pka-reference",
    });
    expect(parsed.tab).toBe("pka-reference");
  });

  it("rejects invalid concentration unit", () => {
    expect(() =>
      parseRunInput({
        tab: "solver",
        concentration_unit: "invalid_unit",
      }),
    ).toThrow();
  });

  it("rejects invalid solve direction", () => {
    expect(() =>
      parseRunInput({
        tab: "solver",
        solve_direction: "sideways",
      }),
    ).toThrow();
  });
});

describe("PepkioClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("initializes with default options", () => {
    const client = new PepkioClient();
    expect(client.getBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it("initializes with custom baseUrl and apiKey", () => {
    const client = new PepkioClient({
      baseUrl: "https://custom.pepkio.com",
      apiKey: "custom-key",
    });
    expect(client.getBaseUrl()).toBe("https://custom.pepkio.com");
  });

  it("fetches manifest without requiring auth", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(MOCK_MANIFEST),
    } as unknown as Response);

    const client = new PepkioClient();
    const manifest = await client.getManifest();

    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Should use cached manifest on subsequent calls
    const cached = await client.getManifest();
    expect(cached.tool_id).toBe(TOOL_ID);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Refresh option should re-fetch
    await client.getManifest({ refresh: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("lists examples from manifest", () => {
    const client = new PepkioClient();
    const examples = client.listExamples(MOCK_MANIFEST);
    expect(examples).toHaveLength(3);
    expect(examples[0].name).toBe("phosphate_50mM_pH74");
  });

  it("retrieves example input", async () => {
    const client = new PepkioClient();
    const input = await client.getExampleInput("phosphate_50mM_pH74", MOCK_MANIFEST);
    expect(input.tab).toBe("solver");
    expect(input.buffer_id).toBe("phosphate");
    expect(input.target_ph).toBe(7.4);
  });

  it("throws on unknown example input", async () => {
    const client = new PepkioClient();
    await expect(client.getExampleInput("non_existent", MOCK_MANIFEST)).rejects.toThrow(
      'Example "non_existent" not found',
    );
  });

  it("requires api key to run", async () => {
    delete process.env.PEPKIO_API_KEY;
    delete process.env.LOCAL_PEPKIO_API_KEY;

    const client = new PepkioClient({ apiKey: undefined, baseUrl: "https://tools.pepkio.com" });
    await expect(
      client.run({
        tab: "solver",
        target_ph: 7.4,
      }),
    ).rejects.toThrow(PepkioAPIError);
  });

  it("executes run successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(MOCK_RUN_RESULT),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const result = await client.run({
      tab: "solver",
      solve_direction: "reverse",
      buffer_id: "phosphate",
      target_ph: 7.4,
      total_concentration: 50,
      concentration_unit: "mM",
      final_volume: 100,
      volume_unit: "mL",
    });

    expect(result.status).toBe("completed");
    expect(result.run_id).toBe("test-run-123");
    expect(result.result?.solver?.target_ph).toBe(7.4);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/tools/ph-buffer-solver/run",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("executes solveReverse helper", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(MOCK_RUN_RESULT),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const result = await client.solveReverse({
      bufferId: "phosphate",
      targetPh: 7.4,
      totalConcentration: 50,
      finalVolume: 100,
      temperatureC: 25,
      reagentMode: "solid_solid",
    });

    expect(result.status).toBe("completed");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("executes solveForward helper", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(MOCK_RUN_RESULT),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const result = await client.solveForward({
      bufferId: "tris",
      moleRatio: 0.5,
      totalConcentration: 50,
      finalVolume: 100,
    });

    expect(result.status).toBe("completed");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("executes getPKALibrary helper", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          run_id: "pka-run",
          status: "completed",
          result: {
            tab: "pka-reference",
            library: { buffers: [{ id: "tris", label: "Tris", pKa_25C: 8.072 }] },
          },
        }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const result = await client.getPKALibrary();

    expect(result.status).toBe("completed");
    expect(result.result?.library?.buffers).toHaveLength(1);
  });

  it("fetches previous run with getRun", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(MOCK_RUN_RESULT),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const result = await client.getRun("test-run-123");

    expect(result.run_id).toBe("test-run-123");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/runs/test-run-123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("waitForRun polls until completed", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          text: async () => JSON.stringify({ run_id: "poll-run", status: "running" }),
        } as unknown as Response;
      }
      return {
        ok: true,
        text: async () => JSON.stringify(MOCK_RUN_RESULT),
      } as unknown as Response;
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    const result = await client.waitForRun("poll-run", { intervalMs: 10, timeoutMs: 500 });

    expect(result.status).toBe("completed");
    expect(callCount).toBe(2);
  });

  it("handles HTTP error response properly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () =>
        JSON.stringify({
          error: { code: "VALIDATION_FAILED", message: "target_ph is out of bounds" },
        }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(client.run({ tab: "solver", target_ph: -5 })).rejects.toThrow(
      "target_ph is out of bounds",
    );
  });

  it("handles response body error field properly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "failed-run",
          status: "failed",
          error: { message: "Calculation could not converge" },
        }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(client.run({ tab: "solver" })).rejects.toThrow(
      "Calculation could not converge",
    );
  });
});
