# PROJECT ATLAS: TECHNICAL ARCHITECTURE
## Engineering Reference (Living Document)

This document describes how the codebase is actually built, as distinct from the game-design specs in `docs/specifications/`. It is updated whenever the architecture changes, so it always reflects the current state of `src/`. Last updated: Milestone 1.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Build/dev server | Vite |
| UI | React 18 |
| State management | Zustand |
| Rendering (M1) | Canvas 2D, behind a renderer abstraction (see §3) |
| Styling | Tailwind CSS |
| Testing | Vitest |
| Persistence | JSON snapshots to `saves/` and browser `localStorage` |

No backend and no paid cloud services — the simulation runs entirely client-side.

---

## 2. Folder Responsibilities

```
src/
├── engine/       Pure TypeScript simulation data model + save system. No React/DOM/Canvas imports.
├── simulation/   Turn-resolution logic (economy, politics, crises) — populated from Milestone 3 onward.
├── ai/           Utility-AI decision logic and leader-profile scoring — populated from Milestone 4 onward.
├── gameplay/     Player command handlers (construction, tax, diplomacy, unit orders) — populated from Milestone 3 onward.
├── map/          Map generation and hex-grid data (terrain assignment, world layout).
├── graphics/     Rendering layer: WorldRenderer interface + implementations, AssetManager, camera.
├── ui/           React components, HUD, Zustand store (the bridge between engine state and the DOM).
└── utils/        Framework-agnostic helpers: seeded PRNG, hex coordinate math.
```

`engine/`, `simulation/`, `ai/`, `map/`, and `utils/` must never import from `react`, `zustand`, or `graphics/` — they are pure logic, testable in isolation and swappable to a Web Worker later without touching the UI.

---

## 3. Rendering Abstraction

All drawing goes through a `WorldRenderer` interface (`src/graphics/renderer/WorldRenderer.ts`):

```ts
interface WorldRenderer {
  init(canvas: HTMLCanvasElement): void;
  resize(width: number, height: number): void;
  renderFrame(world: WorldSnapshot, camera: CameraState): void;
  hexAt(screenX: number, screenY: number, camera: CameraState): AxialCoord | null;
  destroy(): void;
}
```

`CanvasWorldRenderer` is the Milestone 1 implementation. A `createRenderer(kind: 'canvas2d' | 'webgl')` factory in `src/graphics/renderer/createRenderer.ts` is the only place that chooses an implementation. Simulation code, gameplay code, the save system, and React components depend only on the `WorldRenderer` interface and `CameraState`/`WorldSnapshot` types — never on Canvas or WebGL APIs directly. Adding a WebGL renderer later means writing `WebGLWorldRenderer` and changing one line in the factory.

---

## 4. Asset Management

`AssetManager` (`src/graphics/assets/AssetManager.ts`) loads and caches all visual assets by logical key (e.g. `terrain.plains`, `civ.flag.default`), resolved through a manifest (`src/graphics/assets/assetManifest.ts`). Gameplay and rendering code never reference a file path or draw a hard-coded color/shape directly — they call `assetManager.get('terrain.plains')` and receive whatever the manifest currently maps that key to.

**Milestone 1 state:** the `assets/` folders (`terrain`, `sprites`, `portraits`, etc.) contain no real art yet. The manifest maps each M1 key to a procedurally-generated placeholder (a flat-shaded canvas swatch produced by `src/graphics/assets/placeholderGenerators.ts`), registered under the exact key name real artwork will use later. Replacing a placeholder with real art means editing the manifest entry to point at a file in `assets/` — no code changes.

---

## 5. Map Generation (Milestone 1 scope)

`src/map/hexGrid.ts` assigns a terrain type to each hex using the seeded PRNG (weighted random: mostly Plains, with Hills/Mountains/Ocean scattered in) — enough terrain variation to satisfy the M1 visual bar without building the full Milestone 2 Perlin/Simplex heightmap system yet. This function is the seam Milestone 2's real heightmap generator replaces; nothing outside `map/` needs to change when that happens.

---

## 6. State Management

`src/ui/state/simulationStore.ts` is a Zustand store holding the current `WorldSnapshot`, camera state, selection state, and simulation controls. It wraps `engine/` functions (e.g. save/load) but contains no simulation logic itself — it is the bridge the React layer reads from and dispatches actions through.

---

## 7. Save System

`src/engine/saveSystem.ts` serializes `{ world, factions, prngState }` to JSON, writes it to `localStorage` (auto and on-demand), and supports file export/import for portability. PRNG state is part of every snapshot so a reload reproduces subsequent turns deterministically.

---

## 8. Testing

Vitest covers `utils/` (hex math, PRNG determinism) starting in Milestone 1. Coverage expands to `simulation/` turn-resolution math in Milestone 3 and the full headless replayability protocol (`docs/qa/replayability_variability_protocol.md`) in Milestone 6.

---
*This document will be revised at the end of each milestone to reflect what was actually built.*
