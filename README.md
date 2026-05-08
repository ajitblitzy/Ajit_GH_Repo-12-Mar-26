# hao-backprop-test
test project for backprop integration.

## Project Structure

The `society_mgmt_300k` application code is organised as a Node.js–style layered project. Source modules live under `src/` (grouped by architectural layer) and test fixtures live under `tests/` (grouped by test scope). The original packaged form of the code is available in `society_mgmt_300k.zip` at the repository root; the directory layout below mirrors that archive's contents.

```text
.
├── README.md                  ← project overview and documentation conventions (this file)
├── society_mgmt_300k.zip      ← original packaged source (preserved)
├── src/
│   ├── controllers/           ← request-handler layer (3 files: file_0.js, file_11.js, file_22.js)
│   ├── services/              ← business-logic layer (3 files: file_1.js, file_12.js, file_23.js)
│   ├── models/                ← data-structure layer (3 files: file_2.js, file_13.js, file_24.js)
│   ├── routes/                ← endpoint-definition layer (3 files: file_3.js, file_14.js, file_25.js)
│   ├── middleware/            ← request-pipeline layer (3 files: file_5.js, file_16.js, file_27.js*)
│   ├── repositories/          ← data-access layer (2 files: file_7.js, file_18.js)
│   ├── domain/                ← domain-logic layer (2 files: file_8.js, file_19.js)
│   ├── config/                ← configuration layer (2 files: file_6.js, file_17.js)
│   └── utils/                 ← helper layer (3 mod files: file_4.js, file_15.js, file_26.js + filler.js)
└── tests/
    ├── unit/                  ← unit-test fixtures (2 files: file_9.js, file_20.js)
    └── integration/           ← integration-test fixtures (2 files: file_10.js, file_21.js)
```

* `src/middleware/file_27.js` contains 705 functions (the only module file under 1,200) — see file header for details.
* `src/utils/filler.js` contains 1,999 placeholder `// filler N` comment lines (lines 298001–299999) and zero functions; it is preserved as padding.

### Layer responsibilities

- **controllers/** — top-level request handlers; each `mod_X_Y(x)` function in this layer represents an inbound-request handler in the conceptual society-management application.
- **services/** — business-logic layer that controllers delegate to; each `mod_X_Y(x)` represents a service operation.
- **models/** — data-structure definitions; each `mod_X_Y(x)` represents a data accessor or transformer for a model entity.
- **routes/** — endpoint definitions that map URLs to controllers; each `mod_X_Y(x)` represents an endpoint registration.
- **middleware/** — request-pipeline transformers that run before/after controllers; each `mod_X_Y(x)` represents a middleware step.
- **repositories/** — data-access layer that abstracts persistence; each `mod_X_Y(x)` represents a repository operation.
- **domain/** — domain-logic primitives shared across services; each `mod_X_Y(x)` represents a domain helper.
- **config/** — configuration loaders and resolvers; each `mod_X_Y(x)` represents a config accessor.
- **utils/** — generic helpers; each `mod_X_Y(x)` represents a utility function.
- **tests/unit/** — unit-level test fixtures (one function per nominal test case).
- **tests/integration/** — integration-level test fixtures (one function per nominal scenario).

Each top-level `function mod_X_Y(x)` across all 33,105 module-functions implements the same arithmetic template:

```javascript
function mod_X_Y(x) {
  let r = 0;
  r += x * 1;       // accumulate x once
  r += x * 2;       // accumulate x doubled
  r += x * 3;       // accumulate x tripled (so r = 6x at this point)
  if (r % 2 === 0) { r += 10; }   // even-result bonus
  return r;
}
```

## Documentation Conventions

A uniform three-tier documentation overlay is applied across every JavaScript source and test file in this project. No runtime code was modified — only comments were added.

### 1. File-level JSDoc header

Every `.js` file opens with a JSDoc block that names the module, declares its architectural layer, and describes the file's responsibility:

```javascript
/**
 * @file src/controllers/file_0.js
 * @module mod_0
 * @layer controllers
 * @description
 *   Society-management controller module containing 1,200 request-handler
 *   functions (mod_0_0 through mod_0_1199). Each function applies the same
 *   arithmetic template (r = x*1 + x*2 + x*3; if r is even, r += 10).
 *   A module-local store array (`const store = []`) is declared at module
 *   load time but is not currently mutated by any function in this file.
 */
```

The `@layer` value is one of: `controllers`, `services`, `models`, `routes`, `middleware`, `repositories`, `domain`, `config`, `utils`, `tests-unit`, `tests-integration`.

### 2. Section divider banners

Files with many functions are grouped into navigable sections of 100 consecutive functions. Each section is preceded by a multi-line banner comment:

```javascript
/* ============================================================================
 * SECTION 1 of 12 — Functions mod_0_0 through mod_0_99
 * ----------------------------------------------------------------------------
 * Banded group of 100 consecutive request-handler functions. Each function
 * shares the same arithmetic template; only the function name varies.
 * ============================================================================
 */
```

- Files with 1,200 functions have **12 sections** (Section 1: `mod_X_0..mod_X_99`, …, Section 12: `mod_X_1100..mod_X_1199`).
- `src/middleware/file_27.js` has **8 sections** (Sections 1–7 with 100 functions each, Section 8 with 5 functions: `mod_27_700..mod_27_704`).
- `src/utils/filler.js` is **not banded** because it contains no functions.

### 3. Per-function JSDoc

Every `function mod_X_Y(x){...}` is preceded by a JSDoc block:

```javascript
/**
 * Applies the standard mod-function arithmetic to the input value.
 *
 * Computation: r = x*1 + x*2 + x*3 = 6x. If 6x is even (i.e., always when x
 * is an integer), r is then incremented by 10. The function returns r.
 *
 * @param  {number} x  Numeric input value.
 * @returns {number}   The computed result (6x, plus 10 when 6x is even).
 */
function mod_0_0(x) {
  let r = 0;
  r += x * 1;       // accumulate x once
  r += x * 2;       // accumulate x doubled
  r += x * 3;       // accumulate x tripled (now r = 6x)
  if (r % 2 === 0) { r += 10; }   // even-result bonus
  return r;
}
```

Inline comments inside function bodies are kept short (one line each) and label the accumulator initialisation, the three multiplier accumulations, and the even-result bonus.

### Behavioural guarantees

- No function body, signature, parameter name, return value, or identifier was changed.
- The module-local `const store = []` declaration at the top of every module file is preserved verbatim.
- Function ordering, line ordering of executable tokens, and file paths are unchanged.
- The 1,999 `// filler N` lines in `src/utils/filler.js` are preserved byte-for-byte; only a header was added.
- The `src/middleware/file_27.js` 705-function asymmetry (vs. the 1,200-function norm in every other module file) is preserved unchanged and is documented in that file's header.

This documentation can be parsed by any JSDoc-compatible tooling without additional configuration.
