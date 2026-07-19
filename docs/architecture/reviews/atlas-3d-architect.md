# Atlas 3D Architect — Review

Scope per `.claude/agents/atlas-3d-architect.md`: 3D web technology selection, how a true-3D renderer fits the existing `WorldRenderer` abstraction, defining what "true 3D conversion" concretely means, scoping the first playable 3D vertical slice, and flagging architectural performance risks (coordinating with, not duplicating, `atlas-performance-engineer`'s full analysis). This is research/design only — no renderer code was touched; `package.json` currently has no 3D dependency installed (`react`, `react-dom`, `zustand` only), so this is a greenfield technology decision, not a migration of existing code.

---

## Recommended Technology & Rationale

**Recommendation: Three.js, used directly (imperative, inside the existing `WorldRenderer` class shape) — not react-three-fiber, not Babylon.js, not PlayCanvas.**

| Criterion | Three.js | react-three-fiber | Babylon.js | PlayCanvas |
|---|---|---|---|---|
| Bundle size | ~150-180KB min+gzip for core (scene/camera/renderer/geometry); pay only for what you import via tree-shaking | Three.js cost + ~10-20KB wrapper + reconciler overhead | ~300KB+ min+gzip even for a minimal scene (batteries-included engine: physics stubs, GUI, loaders bundled by default) | Comparable to Babylon; also pulls in an engine-wide runtime and (commonly) their editor/asset workflow assumptions |
| Hex-grid/terrain suitability | Native `BufferGeometry`/`InstancedMesh` is exactly the right primitive for thousands of identical hex prisms; no impedance mismatch | Same underlying capability, but instancing in R3F means fighting the React reconciler for a non-React-shaped problem (thousands of tiles is not a React component-tree problem) | Equally capable, but its scene-graph/node ownership model is heavier for a "swap a map layer" use case | Equally capable; its strength (built-in editor, multiplayer templates) is irrelevant here |
| Camera/orbit controls | `OrbitControls`/custom RTS-camera addon is trivial to hand-roll on top of `PerspectiveCamera`; full control over easing to match existing `lerpCamera` feel | Same controls, wrapped through `@react-three/drei` — adds a dependency layer for something 20 lines of Three.js already does | Built-in `ArcRotateCamera` is good but is Babylon's own abstraction, not composable with the plain-object `CameraState` already in `camera.ts` | Similar to Babylon — camera is an engine-owned entity, not a plain-data object |
| TypeScript support | First-class, mature `.d.ts`, most third-party examples ported straight to TS | First-class but types leak React generics into scene code | First-class, arguably the most "enterprise TS" of the four | Good but historically JS-first; TS story is newer |
| Fit with existing React + Zustand architecture | **Best fit.** `WorldRenderer` is already a plain class with an imperative `init/resize/renderFrame/destroy` lifecycle that owns a canvas outside React's render loop — this is precisely the Three.js usage pattern (own the scene graph, run your own RAF loop, take snapshots as plain data). No React binding needed at all. | **Worst fit for this codebase.** R3F wants to own the render loop as a React tree and re-render via props/state changes — it actively fights the "renderer is a class instantiated once behind an interface, driven imperatively by the store" design already locked in `WorldRenderer.ts`. Adopting R3F would mean either running two render paradigms side by side or partially inverting the existing architecture. | Fit is neutral-to-poor: Babylon expects to own more of the app shell (its own asset containers, its own scene serialization) than the codebase's asset/save-system boundaries assume | Fit is neutral-to-poor, same reasoning as Babylon, plus PlayCanvas nudges toward its own project/build tooling that this Vite-based repo doesn't use |

Three.js used imperatively — not through react-three-fiber — is the recommendation specifically *because* `WorldRenderer` already is the imperative-class-behind-an-interface shape (see `WorldRenderer.ts` lines 18-29: `init`, `resize`, `renderFrame`, `hexAtScreenPoint`, `destroy` — a lifecycle, not a component tree). A `WebGLWorldRenderer` class wrapping a `THREE.Scene`/`THREE.WebGLRenderer` internally slots into that exact shape with zero interface friction. React never needs to know a `THREE.Scene` exists, exactly as it never needs to know a `CanvasRenderingContext2D` exists today.

---

## Renderer Interface Impact

The existing interface holds up well and needs **no breaking changes** for a first 3D implementation — one addition is proposed as additive/optional:

- `init(canvas, assets)` — unchanged. `WebGLWorldRenderer.init()` would call `canvas.getContext('webgl2')` (or hand the canvas to `THREE.WebGLRenderer({ canvas })`) internally. Callers never see this.
- `resize(widthPx, heightPx)` — unchanged in signature. Internally becomes `camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h)` instead of canvas-buffer math. DPR handling (`window.devicePixelRatio`) is still the renderer's own concern, matching the current `CanvasWorldRenderer.resize` pattern.
- `renderFrame(world, camera, interaction, nowMs)` — unchanged. This is the one signature that matters most and it already passes everything a 3D renderer needs: `WorldSnapshot` (map/factions/cities as plain data), `CameraState`, hover/selection state, and a timestamp for animation. No engine/save/UI code needs to know or care that `camera: CameraState` (currently an `{x, y, zoom}` pan/zoom pair) is being reinterpreted as an orbit/perspective camera internally.
- `hexAtScreenPoint(screenX, screenY, camera)` — unchanged signature, different internals: instead of the current inverse-affine-transform math (`CanvasWorldRenderer.hexAtScreenPoint`), a 3D implementation raycasts from screen space through the perspective camera into the terrain mesh/plane and resolves the intersected hex. This is more expensive per-call than the current O(1) algebra, but it is call-on-hover/click, not per-frame, so it is not a frame-budget concern.
- `destroy()` — unchanged signature; 3D implementation must additionally dispose GPU resources (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`) that the 2D version never had to manage. This is an internal correctness requirement (WebGL context/memory leak risk on repeated init/destroy, e.g. React StrictMode double-invoke or a "load different save" flow), not an interface change.

**Proposed genuinely-new surface (additive, not breaking):** `CameraState` today is a 2D pan/zoom pair (`x, y, zoom`). A 3D camera needs more degrees of freedom (orbit angle, pitch/tilt, possibly target height). Two options, and this is the one place I'd flag as needing a decision rather than silently picking one:
1. **Extend `CameraState`** with optional 3D fields (`tiltDeg?`, `orbitDeg?`, `heightZ?`) that `CanvasWorldRenderer` simply ignores. Keeps one camera type across both renderers; cheap for save-file/UI-state compatibility since `CanvasWorldRenderer` already tolerates fields it doesn't use.
2. **Introduce a renderer-specific camera type** and widen `WorldRenderer.renderFrame`'s second parameter to a union, pushing translation logic into a `to3DCamera(state: CameraState)` adapter that lives in `graphics/` only.

I recommend option 1 for the vertical slice (smallest change, no new types threaded through the store), but this does touch a type (`CameraState`) that other UI code reads (camera controls, minimap, etc. if any exist), so per `MULTI_AGENT_WORKFLOW.md`'s shared-contract-change rule, this should be called out explicitly to the Project Director rather than assumed.

---

## Vertical Slice Scope

**Goal:** prove the `WorldRenderer` abstraction survives a second, structurally different implementation — not build a 3D game. Scope modeled directly on the game-director's Finding 3/Recommendation 2 (constrain to the existing contract).

**In scope:**
- One new file, `src/graphics/renderer/WebGLWorldRenderer.ts`, implementing `WorldRenderer` verbatim (no interface changes required beyond the optional `CameraState` extension above).
- One `RendererKind` addition already reserved in `createRenderer.ts` (`case "webgl":` already stubbed with a "not implemented yet" error — the seam is literally already there).
- Terrain representation: **extruded hex prisms**, not a heightmap mesh, for the slice. Rationale: the current `HexMap` (`src/map/hexGrid.ts`) is a flat `TerrainType` enum per tile (`plains | hills | mountains | ocean`) with no elevation data at all. A heightmap-mesh renderer would require map-generation changes (`atlas-world-designer` territory — flagged below as a dependency, not assumed). Extruded prisms need only a per-tile height *lookup* keyed by the existing `TerrainType` (e.g. ocean = flat/below sea level, hills = short prism, mountains = tall prism) — zero changes to `map/hexGrid.ts` or `engine/types.ts`.
- One camera mode: static-angle orbit (fixed tilt, yaw/pan/zoom only) reusing the existing pan/zoom input handling already wired to `CameraState`, extended per the interface note above.
- One lighting setup: a single directional light + ambient fill — enough to read the extruded geometry, not a day/night or weather system.
- Assets: reuse the *existing* `AssetManager` key contract (`terrain.plains`, `terrain.hills`, etc.) but resolve them to flat-color materials or a simple procedural texture per key instead of the current placeholder canvas swatches — this is an `AssetManager`/manifest-level change (a new `kind: "material"` or similar), not a `WorldRenderer` one, and is the one dependency this proposal has on `AssetManager`'s owner.
- Coverage: the full existing 40×40 `DEFAULT_MAP_CONFIG` grid (not a "handful of tiles" — instancing makes the full grid roughly the same cost as a handful, see Performance Risks below), hover highlight, click-select with the existing selection-animation timing (`SELECTION_ANIM_MS`), and pulsing territory borders re-implemented as an emissive/opacity pulse on the border mesh — because these are the exact M1 "non-negotiable visual requirements" (`milestone_roadmap.md` M1) the slice must prove it can still satisfy, not new scope.

**Explicitly out of scope for the vertical slice** (per game-director Recommendation 2 / Finding 3 — these would be scope creep, not slice-proving):
- Any change to `engine/`, `simulation/`, `ai/`, `gameplay/`, save system, or Zustand store beyond reading the existing `WorldSnapshot`/`CameraState`.
- Unit/army models, weather particles, day/night cycles, multiple biome-driven mesh variants, LOD systems.
- A heightmap-driven terrain mesh (depends on `atlas-world-designer`'s M2 elevation data model — sequence, don't parallel-build).
- Replacing `CanvasWorldRenderer` as the default (`createRenderer`'s default case stays `canvas2d` until/unless the Project Director decides otherwise — this mirrors the open question the game-director already raised).

**Definition of done for the slice:** load an existing save file, render the same `WorldSnapshot` through `createRenderer("webgl")` instead of `"canvas2d")`, get correct hex picking, hover/select feedback, and pulsing borders, at a frame rate that meets whatever budget `atlas-performance-engineer` sets (see below) — with zero changes to any file outside `graphics/renderer/` and `graphics/assets/`.

---

## Performance Risks (Architectural)

This is the section most likely to collide with `atlas-performance-engineer`'s recommendation, flagged explicitly per the game-director's review (its Contradictions §2 already predicted this as "the single highest-probability disagreement in this review round"). I am giving my architectural view; I have not seen the performance-engineer's budget numbers.

- **Draw calls / mesh count:** a naive "one mesh per hex tile" approach on a 40×40 grid (1,600 tiles, potentially several thousand once city markers, unit tokens, and border overlays are added) would be a serious mistake — that's 1,600+ draw calls per frame, which will visibly stutter on integrated/mobile GPUs. This is solvable and well-trodden (`THREE.InstancedMesh` renders all same-geometry hexes in one draw call, keyed by a per-instance color/height attribute for terrain type), but it is **not free** — it requires designing the tile-to-instance-attribute pipeline up front, not retrofitting it later. This is the single most important architectural decision for the slice to get right.
- **Border/selection overlays:** the current 2D renderer draws per-tile stroke paths for owned-territory borders and hover/select outlines cheaply (`ctx.stroke()` is nearly free). In 3D, naively drawing a separate line/edge mesh per bordered tile reintroduces the draw-call problem this instancing was meant to solve. This needs its own instanced or shader-based approach (e.g., an edge-detection fragment shader on a border-mask texture, or a second instanced mesh for border segments only) — flagging this now so it isn't discovered late.
- **Mobile/low-end GPU:** WebGL2 context creation, shader compilation stalls, and texture memory are all real constraints Canvas 2D never had to think about. A `WebGLWorldRenderer` needs a context-loss handler (`webglcontextlost`/`webglcontextrestored`) that Canvas 2D never needed — this is new failure-mode surface area, not just new rendering surface area.
- **Startup cost:** Three.js's parsed+executed JS is meaningfully heavier than the current all-Canvas-2D bundle, and shader compilation adds a first-frame stall that didn't exist before. This is a real regression against Milestone 1's already-shipped, already-fast baseline — the tradeoff is visual fidelity vs. time-to-first-interactive-frame, and it's a legitimate open question whether that trade is worth it for the MVP tier at all (echoing the game-director's Finding 1: the GDD doesn't currently place 3D in any tier).
- **Where I expect to disagree with `atlas-performance-engineer`:** if their budget is built around the *current* Canvas 2D baseline (which is close to zero GPU/driver overhead — it's 2D compositing), any 3D approach is a strictly larger resource footprint on every axis (bundle size, GPU memory, draw calls, shader compile time, battery/thermal on mobile). I'm not going to pre-resolve that tension by picking a "lite" 3D approach on their behalf (e.g., recommending against instancing, or recommending a 2.5D isometric fake instead of a true 3D camera) — that's their budget to set and the Project Director's call to reconcile against the "true 3D conversion" ask. My position is only: **if** 3D is approved, InstancedMesh + Three.js imperative is the least-bad architecture for this codebase; whether 3D should be approved at all given the performance budget is outside my scope to decide.

---

## Contradictions or Disagreements Found

I did not have access to any other specialist's file at write time except `atlas-game-director.md` (already committed to `docs/architecture/reviews/` when I started). Points of note relative to that file:

1. **Confirms, does not contradict**, the game-director's Finding 2 and Recommendation 2 (constrain 3D work to the existing `WorldRenderer` contract) — my proposal above implements exactly that constraint.
2. **Adds one nuance the game-director's review didn't cover:** a true 3D camera cannot be represented by the current `CameraState` (`{x, y, zoom}`) without extension. This is a small, additive type change, but it is a change to a type shared with UI/store code, which the game-director's Recommendation 2 says should be "flagged as a breaking change... requiring sequential, reviewed work — not parallel implementation" if it touches the shared contract. I'm flagging it now so the Project Director can decide whether the `CameraState` extension needs the same sequential-review treatment as an interface change, even though `WorldRenderer`'s own method signatures don't change.
3. **Anticipated, not yet observed, conflict with `atlas-performance-engineer`** (see Performance Risks above) — per the game-director's own prediction in their Contradictions §2. I have not silently resolved it in either direction.
4. **Dependency on `atlas-world-designer`** (not yet seen): the vertical slice deliberately avoids heightmap-based terrain to sidestep a dependency on procedural elevation data that likely belongs to that specialist's Milestone 2 work. If their proposal already includes an elevation/heightmap data shape, the "extruded hex prisms from `TerrainType` alone" scoping in this document should be revisited — I chose the lower-dependency option specifically because I could not read their output first.

---

## Open Questions for the Project Director

1. Does "true 3D conversion" get placed in a GDD tier at all (per the game-director's Finding 1/Open Question 1)? My technology recommendation stands regardless of tier, but the vertical-slice *priority* depends entirely on this answer.
2. Is the intent for `WebGLWorldRenderer` to eventually replace `CanvasWorldRenderer` as the shipped default, or remain a permanent opt-in/parallel path (e.g., a settings toggle, or a fallback for low-end devices)? This changes whether `CanvasWorldRenderer` needs to be maintained long-term or can be treated as disposable once the 3D path is proven.
3. Should `CameraState` be extended in place (my recommendation, option 1 above) or should a separate 3D-camera type be introduced with an adapter layer? This is a shared-contract decision I don't think is mine to make unilaterally.
4. What is `atlas-performance-engineer`'s actual frame-budget target (e.g., 60fps on what reference hardware — a 2020 mid-range laptop integrated GPU? a phone?) — my architectural recommendations (instancing, avoiding per-tile draw calls) are necessary regardless of the number, but whether a *true 3D* approach can hit that number at all versus a 2.5D/isometric compromise is a question only their budget can answer, and I'd rather get that number before the vertical slice is greenlit than discover a mismatch after building it.
5. Should the vertical slice's terrain-material assets (a new `AssetManager` entry kind, per Vertical Slice Scope above) be specified by me, by whoever owns `AssetManager`/manifest, or jointly? I've assumed a minimal additive manifest change but haven't seen if another specialist already has manifest-shape opinions.
