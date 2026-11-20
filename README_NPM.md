# Pepkio pH Buffer Solver

Typed TypeScript and Node.js SDK with CLI for Henderson–Hasselbalch buffer equilibria, bidirectional recipe formulation, temperature pKa compensation, and buffer capacity calculation via the Pepkio Tools REST API.

# What It Does

In biochemistry, molecular biology, cell culture, and assay development, formulating reproducible buffers requires balancing acid and conjugate base components, compensating for temperature-dependent dissociation constants ($pKa$), evaluating buffer capacity, and converting theoretical ratios into precise laboratory bench recipes.

This package provides a typed Node.js/ESM client and command-line interface to solve biological buffer systems via the Pepkio Tools REST API. It supports bidirectional solving—either calculating reagent masses or stock volumes from a target pH (reverse mode) or predicting equilibrium pH from base-to-acid mole ratios (forward mode), while calculating buffer capacity ($\beta$) and providing temperature-corrected pKa values.

Programmatic runs require an active network connection and a Pepkio API key. Calculations are processed via the Pepkio Tools REST API.

# Features

- **Bidirectional Buffer Solving**: Reverse mode calculates exact reagent masses or stock volumes from target pH, concentration, and volume; forward mode predicts equilibrium pH and ratio.
- **Three Preparation Modes**: Supports solid-solid pairs (dry acid and base), stock-stock mixtures (concentrated liquid stocks), and single-component acid/base titration (e.g. adjusting with HCl or NaOH).
- **Thermodynamic Temperature Compensation**: Adjusts pKa values across working temperatures (e.g. 4°C, 25°C, 37°C) using thermodynamic temperature coefficients ($dpKa/dT$).
- **Buffer Capacity ($\beta$) Evaluation**: Calculates intrinsic buffer capacity in $\text{mM/pH}$ and flags out-of-range deviations ($|\text{pH} - \text{p}K_a| > 1$).
- **Curated pKa Reference Library**: Includes thermodynamic constants, molecular weights, and temperature coefficients for common biological buffers (Tris, Phosphate, HEPES, MOPS, MES, Citrate, Glycine, Acetate, and custom buffers).
- **Manifest and Example Inspection**: Inspect pre-configured examples using `getManifest`, `listExamples`, and `getExampleInput`.
- **Command-Line Interface (CLI)**: Inspect manifests and run buffer calculations directly via `npx pepkio-ph-buffer-solver`.
- **TypeScript & ESM Native**: Fully typed with runtime parameter validation powered by Zod.

# Installation

```bash
npm install pepkio-ph-buffer-solver
```

Requires Node.js 18 or newer.

# Configuration

Set an API key with **tools:run** scope before calling `run()`, `solveReverse()`, or `solveForward()`:

```bash
export PEPKIO_API_KEY="your-api-key"
```

Create an API key in your [Pepkio account settings](https://www.pepkio.com/account/api-keys).

Optional configuration variables:

| Variable | Purpose |
|----------|---------|
| `PEPKIO_API_KEY` | Production API key (for remote API calls) |
| `LOCAL_PEPKIO_API_KEY` | Local development key when `PEPKIO_API_BASE_URL` points to `tools.localtest.me` |
| `PEPKIO_API_BASE_URL` | API base URL (default: `https://tools.pepkio.com`) |

# Quick Example

```typescript
import { PepkioClient } from "pepkio-ph-buffer-solver";

const client = new PepkioClient({ apiKey: process.env.PEPKIO_API_KEY });

// Solve recipe for a 50 mM Phosphate buffer at pH 7.4 (100 mL, 25°C)
const response = await client.solveReverse({
  bufferId: "phosphate",
  targetPh: 7.4,
  totalConcentration: 50,
  concentrationUnit: "mM",
  finalVolume: 100,
  volumeUnit: "mL",
  temperatureC: 25,
});

if (response.result?.solver) {
  const solver = response.result.solver;
  console.log(`Target pH: ${solver.target_ph}`);
  console.log(`Buffer Capacity: ${solver.buffer_capacity_mM_per_pH} mM/pH`);
  if (solver.recipe) {
    console.log(`Acid Component: ${solver.recipe.component_1_label} (${solver.recipe.component_1_amount} ${solver.recipe.component_1_unit})`);
    console.log(`Base Component: ${solver.recipe.component_2_label} (${solver.recipe.component_2_amount} ${solver.recipe.component_2_unit})`);
  }
}
```

# CLI

```bash
# Inspect available manifest examples
npx pepkio-ph-buffer-solver manifest --examples

# Run a pre-configured manifest example
npx pepkio-ph-buffer-solver run --example phosphate_50mM_pH74
```

# Typical Use Cases

- **Biological Buffer Preparation**: Formulate standard laboratory buffers (Phosphate/PBS, Tris-HCl, HEPES, MES, MOPS, Citrate) for cell culture, enzyme assays, and chromatography.
- **Temperature Compensation**: Calculate buffer recipe adjustments at room temperature (20–25°C) for experiments conducted at 4°C cold rooms or 37°C incubators.
- **Titration Volume Calculation**: Determine exact volume of 1 M HCl or 1 M NaOH titrant required to adjust single buffer salts to target pH.
- **Buffer Capacity QC**: Verify buffer capacity ($\beta$) to ensure sufficient buffering against acid/base production in high-density bacterial fermentations and enzymatic assays.
- **Automated Recipe Generation**: Integrate automated recipe calculations into liquid handler workflows and laboratory information management systems (LIMS).

# Scientific Background

The pH of a weak acid/conjugate base buffer pair is governed by the Henderson–Hasselbalch equation:

$$\text{pH} = \text{p}K_a + \log\left(\frac{[\text{A}^-]}{[\text{HA}]}\right)$$

For polyprotic buffer systems such as phosphate ($\text{H}_2\text{PO}_4^- / \text{HPO}_4^{2-}$), the relevant dissociation constant near physiological pH corresponds to $\text{p}K_{a,2} \approx 7.20$.

Buffer capacity ($\beta$), representing resistance to pH shift upon addition of strong acid or strong base, is defined as:

$$\beta = 2.303 \cdot C \cdot \frac{K_a [\text{H}^+]}{(K_a + [\text{H}^+])^2}$$

where $C$ is the total buffer concentration. Buffer capacity reaches maximum when $\text{pH} = \text{p}K_a$.

Temperature modulates dissociation equilibria according to the standard enthalpy of dissociation, shifting pKa linearly near ambient temperature:

$$\text{p}K_a(T) = \text{p}K_a(25^\circ\text{C}) + \frac{d(\text{p}K_a)}{dT}(T - 25)$$

This effect is especially pronounced in amine buffers such as Tris ($dpKa/dT \approx -0.028$/°C).

# Web Application

For researchers who prefer a graphical interface, an interactive web version is available.

Web Application: https://www.pepkio.com/tools/ph-buffer-solver

The web application provides interactive slider controls, custom buffer definition, recipe worksheets, and printable bench protocols.

# Documentation and Resources

GitHub Repository: https://github.com/pepkio/pepkio-ph-buffer-solver-js

Web Application: https://www.pepkio.com/tools/ph-buffer-solver

Python client (PyPI): https://pypi.org/project/pepkio-ph-buffer-solver/

# About Pepkio

Pepkio (https://www.pepkio.com/) develops software tools and bioinformatics solutions for life science researchers, including laboratory calculators and analysis services (https://www.pepkio.com/cro).

A semantic, AI-native version of this document in the K2F format is available at https://k2f.dev (https://k2f.dev/v/dbcfc5e0fc09fcab6a720d9c38f98f8ece4fb8207a97dd22142880f675923d4d)
