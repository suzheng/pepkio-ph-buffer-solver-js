// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { PepkioClient } from "../src/client.js";
import { TOOL_ID } from "../src/config.js";

const LOCAL_BASE_URL = "https://tools.localtest.me";
const PRODUCTION_BASE_URL = "https://tools.pepkio.com";

function envConfig(env: "local" | "production") {
  const baseUrl = process.env.PEPKIO_API_BASE_URL
    ? process.env.PEPKIO_API_BASE_URL.replace(/\/$/, "")
    : env === "local"
      ? LOCAL_BASE_URL
      : PRODUCTION_BASE_URL;

  const isLocal = baseUrl.includes("localtest.me") || baseUrl.includes("localhost");
  const apiKey = isLocal
    ? process.env.LOCAL_PEPKIO_API_KEY ?? process.env.PEPKIO_API_KEY
    : process.env.PEPKIO_API_KEY;

  return { baseUrl, apiKey, isLocal };
}

async function isServerReachable(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/tools/v1/tools/${TOOL_ID}/manifest`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

describe("integration: local", () => {
  const { baseUrl, apiKey } = envConfig("local");

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async (ctx) => {
      if (!(await isServerReachable(baseUrl))) {
        ctx.skip();
        return;
      }
      const client = new PepkioClient({ baseUrl, apiKey });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe(TOOL_ID);
      expect(manifest.title).toBe("pH Buffer Solver");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("phosphate_50mM_pH74");
      expect(names).toContain("tris_forward_ratio");
      expect(names).toContain("pka_library");
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs phosphate_50mM_pH74",
    async (ctx) => {
      if (!(await isServerReachable(baseUrl))) {
        ctx.skip();
        return;
      }
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("phosphate_50mM_pH74");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.tab).toBe("solver");
      expect(result.result?.solver?.target_ph).toBe(7.4);
      expect(result.result?.solver?.buffer_capacity_mM_per_pH).toBeGreaterThan(0);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs tris_forward_ratio",
    async (ctx) => {
      if (!(await isServerReachable(baseUrl))) {
        ctx.skip();
        return;
      }
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("tris_forward_ratio");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result?.tab).toBe("solver");
      expect(result.result?.solver?.ph).toBeCloseTo(7.77, 1);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs pka_library",
    async (ctx) => {
      if (!(await isServerReachable(baseUrl))) {
        ctx.skip();
        return;
      }
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("pka_library");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result?.tab).toBe("pka-reference");
      expect(result.result?.library?.buffers.length).toBeGreaterThan(0);
    },
    60_000,
  );
});

describe("integration: production", () => {
  const { baseUrl, apiKey } = envConfig("production");

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe(TOOL_ID);
      expect(manifest.title).toBe("pH Buffer Solver");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("phosphate_50mM_pH74");
      expect(names).toContain("tris_forward_ratio");
      expect(names).toContain("pka_library");
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs phosphate_50mM_pH74",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("phosphate_50mM_pH74");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.tab).toBe("solver");
      expect(result.result?.solver?.target_ph).toBe(7.4);
      expect(result.result?.solver?.buffer_capacity_mM_per_pH).toBeGreaterThan(0);
      expect(result.result?.solver?.buffer_label).toBe("Sodium phosphate");
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs tris_forward_ratio",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("tris_forward_ratio");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.tab).toBe("solver");
      expect(result.result?.solver?.solve_direction).toBe("forward");
      expect(result.result?.solver?.ph).toBeCloseTo(7.77, 1);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs pka_library",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("pka_library");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.tab).toBe("pka-reference");
      expect(result.result?.library?.buffers.length).toBeGreaterThan(0);
      const tris = result.result?.library?.buffers.find((b) => b.id === "tris");
      expect(tris).toBeDefined();
      expect(tris?.pKa_25C).toBe(8.072);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "fetches completed run with getRun",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("phosphate_50mM_pH74");
      const runResult = await client.run(input);
      expect(runResult.run_id).toBeTruthy();

      const fetched = await client.getRun(runResult.run_id);
      expect(fetched.run_id).toBe(runResult.run_id);
      expect(fetched.status).toBe("completed");
      expect(fetched.result?.tab).toBe("solver");
    },
    60_000,
  );
});
