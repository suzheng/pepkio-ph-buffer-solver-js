// SPDX-License-Identifier: MIT
import { z } from "zod";

export const tabSchema = z.enum(["solver", "pka-reference", "history"]);
export type Tab = z.infer<typeof tabSchema>;

export const solveDirectionSchema = z.enum(["forward", "reverse"]);
export type SolveDirection = z.infer<typeof solveDirectionSchema>;

export const concUnitSchema = z.enum(["M", "mM", "µM", "uM"]);
export type ConcUnit = z.infer<typeof concUnitSchema>;

export const volumeUnitSchema = z.enum(["L", "mL", "µL", "uL"]);
export type VolumeUnit = z.infer<typeof volumeUnitSchema>;

export const reagentModeSchema = z.enum(["solid_solid", "stock_stock", "titrant"]);
export type ReagentMode = z.infer<typeof reagentModeSchema>;

export const titrantSchema = z.enum(["HCl", "NaOH"]);
export type Titrant = z.infer<typeof titrantSchema>;

export const customBufferSchema = z
  .object({
    pka: z.number().optional(),
    mw_acid: z.number().optional(),
    mw_base: z.number().optional(),
    name: z.string().optional(),
  })
  .passthrough();
export type CustomBufferInfo = z.infer<typeof customBufferSchema>;

export const phBufferSolverInputSchema = z
  .object({
    tab: tabSchema.default("solver"),
    solve_direction: solveDirectionSchema.optional(),
    buffer_id: z.string().optional(),
    target_ph: z.number().optional(),
    total_concentration: z.number().positive().optional(),
    concentration_unit: concUnitSchema.optional(),
    final_volume: z.number().positive().optional(),
    volume_unit: volumeUnitSchema.optional(),
    temperature_c: z.number().optional(),
    mole_ratio: z.number().positive().optional(),
    reagent_mode: reagentModeSchema.optional(),
    titrant: titrantSchema.optional(),
    custom_buffer: customBufferSchema.optional(),
    stock_acid_M: z.number().positive().optional(),
    stock_base_M: z.number().positive().optional(),
    titrant_stock_M: z.number().positive().optional(),
  })
  .passthrough();
export type PHBufferSolverInput = z.infer<typeof phBufferSolverInputSchema>;

export function parseRunInput(input: unknown): PHBufferSolverInput {
  return phBufferSolverInputSchema.parse(input);
}
