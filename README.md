# Zort — Rebuild Spec

This branch is the starting point for a **full rebuild** of Zort, a real-time collaborative whiteboard. Do not extend the current Socket.IO + Zustand + SVG implementation. Treat everything under `app/`, `components/`, `store/`, `server/`, and `lib/` as a **legacy product reference** only.

This document is the implementation spec. Follow it as the source of truth for product, architecture, data model, and smoothness requirements.

---

## 1. Why rebuild

The current app is a Next.js 14 whiteboard with Socket.IO event broadcasting. It looks collaborative but is not actually consistent:

- The server only handles `join-room`. Drawing events (`add-element`, `element-updated`, `element-deleted`) are emitted by the client and never handled or persisted.
- Element IDs use `Math.random()`, which can collide.
- History is a local array of full snapshots. Undo/redo fights remote updates and is not shareable.
- The canvas is React + SVG. Every pointer move can re-render the tree. That will not stay smooth with many strokes or multiple users.
- Late joiners do not receive the existing drawing. There is no document, only fire-and-forget events.
- Two users editing the same shape last-write-wins at the whole-element level, if events ever land at all.
- Persistence is claimed (`localStorage`) but not implemented.

The rebuild replaces event-passing with a **CRDT document per room**. Every peer has the same document. Sync is binary deltas, not JSON element dumps. Drawing stays local-first: pixels appear on the current frame, CRDT updates catch up in the background.

---

## 2. Product

Zort is an infinite collaborative whiteboard. A person opens a room URL, draws with others, and the board is still there when they come back.

### 2.1 Must keep (parity)

| Capability | Notes |
|---|---|
| Named rooms | Shareable URL, e.g. `/r/:roomId` |
| Display name on join | Color assigned per user, stable for the session |
| Tools | Select, rectangle, ellipse, text, pencil, eraser |
| Style | Color palette + stroke width |
| Viewport | Pan, zoom (0.1x–5x), grid |
| Undo / redo | Local, CRDT-aware, does not revert other people's work |
| Delete selected | Keyboard and eraser |
| Clear board | Collaborative; everyone sees the empty board |
| Keyboard shortcuts | Same map as today (see §8) |

### 2.2 Must add (the point of the rebuild)

- True multiplayer: two people drawing at once never drop or duplicate strokes.
- Live remote cursors and in-progress strokes (you see the line while they draw it).
- Presence list (who is in the room).
- Offline-tolerant: brief disconnect, keep drawing, merge on reconnect.
- Late join: full board + current users, no refresh dance.
- Local snapshot in IndexedDB so a reload in the same browser is instant.
- Server snapshot so a new browser gets the room.

### 2.3 Explicitly out of scope for v1

- Auth / accounts / permissions
- Comments, chat, or sticky notes
- Images, frames, arrows, connectors, or freehand shape recognition
- Mobile-native apps (touch on the web canvas is in scope)
- PDF / PNG export (nice-to-have after v1)
- AWS ECS / CDK from the old README

---

## 3. Chosen stack

Pick one stack and do not mix CRDT libraries.

| Layer | Choice | Why |
|---|---|---|
| Client | **Vite + React 19 + TypeScript** | The app is a client canvas, not an SSR site. Vite HMR is faster for this than Next. The existing `rewrite` branch already moved this direction. |
| Styling | **Tailwind CSS + shadcn/ui** | Keep the current visual language. Rebuild the landing card and toolbar, do not invent a new design system. |
| Canvas | **Two HTML `<canvas>` layers** + **perfect-freehand** | SVG + React is the current smoothness ceiling. Canvas draws in `requestAnimationFrame`. Perfect Freehand turns pencil points into pressure-aware strokes. |
| CRDT | **Yjs** | Best-documented CRDT for this shape of data (`Y.Map` of shapes, `Y.Array` of points, `Y.Text` for labels). Binary updates. Works in the browser and on the server. |
| Sync | **Hocuspocus** (`@hocuspocus/server` + `@hocuspocus/provider`) | Yjs-native WebSocket server with persistence and auth hooks. Self-hosted, one Node process, no SaaS lock-in. |
| Local persist | **y-indexeddb** | Instant reload of the last known room document. |
| Server persist | **SQLite** via `@hocuspocus/extension-database` + `better-sqlite3` | One file per environment is enough for v1. Swap the adapter for Postgres later without changing the client. |
| Presence | **y-protocols / awareness** | Cursors, pointer buttons, selected ids, display name, color. Ephemeral; not part of the document. |
| Ephemeral UI | **Zustand** | Tool, color, stroke width, viewport, local selection. Never the source of truth for board data. |
| IDs | **nanoid** | Collision-resistant shape and user ids. |
| Schema | **Zod** | Validate awareness payloads and any REST around rooms. Do not Zod every Yjs mutation on the hot path. |
| Package manager | **pnpm** workspaces | `apps/web` and `apps/sync`. |

Do **not** use Socket.IO for document sync. Do **not** put board elements in Zustand. Do **not** use Automerge/Loro/Liveblocks for v1. Do **not** wrap tldraw — rebuild the drawing surface so the product stays Zort.

### 3.1 Repo layout after rebuild

```
apps/
  web/                         # Vite React client
    src/
      main.tsx
      routes/
        Home.tsx               # landing: name + create/join
        Room.tsx               # /r/:roomId
      canvas/
        Whiteboard.tsx         # mounts canvases, wires pointer events
        renderer.ts            # rAF loop, camera, grid, hit test
        tools/                 # pencil, rect, ellipse, text, eraser, select
        spatial-index.ts       # uniform grid for hit testing
      crdt/
        doc.ts                 # Y.Doc factory, typed accessors
        bindings.ts            # Yjs observe → dirty flags (no React)
        undo.ts                # Y.UndoManager per client
        schema.ts              # Element record shape, origins
      presence/
        awareness.ts           # cursor, selection, user
      state/
        ui.ts                  # Zustand: tool, color, zoom, pan
      ui/
        Toolbar.tsx
        PresenceBar.tsx
        RoomEntry.tsx
      lib/
        id.ts                  # nanoid
        geometry.ts
        shortcuts.ts
  sync/                        # Hocuspocus server
    src/
      index.ts
      persistence.ts           # SQLite adapter
      rooms.ts                 # optional create/exists REST
packages/
  shared/                      # types + Zod used by web and sync
    src/
      element.ts
      awareness.ts
      room.ts
```

A single-package repo is acceptable if workspaces feel heavy. Do not split the CRDT schema across apps.

---

## 4. Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                 │
│                                                          │
│  pointer events ──► tool handler ──► Y.Doc (local)       │
│                            │              │              │
│                            │              ▼              │
│                            │         y-indexeddb         │
│                            │              │              │
│                            ▼              ▼              │
│                     overlay canvas   scene canvas        │
│                     (local stroke)   (committed Y.Doc)   │
│                                                          │
│  awareness ──► remote cursors / remote live strokes      │
│                                                          │
│  HocuspocusProvider ◄──binary Yjs updates──► WebSocket   │
└──────────────────────────────┬───────────────────────────┘
                               │
                    apps/sync (Hocuspocus)
                               │
                          SQLite snapshots
```

### 4.1 Source of truth

| Data | Store | Why |
|---|---|---|
| Shapes, points, text, z-order | `Y.Doc` | Must merge across peers |
| Who is here, cursor, live stroke preview | Awareness | High-frequency, ok to drop, must not bloat the doc |
| Active tool, color, stroke width | Zustand | Local only |
| Camera (pan/zoom) | Zustand | Local only. Never sync the camera. |
| In-progress local stroke | Tool module memory | Drawn on the overlay canvas until committed |

### 4.2 Render rule (non-negotiable)

**Do not drive the canvas from React state.**

1. Tools write to Yjs (and overlay memory).
2. Yjs `observeDeep` sets a `dirty` flag.
3. A single `requestAnimationFrame` loop reads the document (or a plain cache updated by observers) and paints.
4. React owns chrome only: toolbar, join form, presence avatars, text editor overlay.

If a pencil point causes a React re-render, the design is wrong.

### 4.3 Network rule

Yjs updates are binary. Awareness is separate and throttled.

- Document updates: default Yjs / Hocuspocus batching. Wrap related mutations in `doc.transact(..., origin)`.
- Live stroke preview: awareness, ~30 Hz, not the document.
- Cursor: awareness, ~30 Hz, skip if the point moved < 2 CSS pixels.
- Commit a stroke to the document **once**, on pointer up (plus a coarse mid-stroke snapshot if the stroke is long — see §6.2).

---

## 5. CRDT document model

One `Y.Doc` per room. Room name = Hocuspocus document name = `roomId`.

```
Y.Doc
├── elements: Y.Map<elementId, Y.Map>     // shape records
├── order:    Y.Array<string>             // z-order, back → front
└── meta:     Y.Map                       // { createdAt, name? }
```

### 5.1 Element record (`Y.Map`)

Every shape is a nested `Y.Map` so fields merge independently.

| Key | Type | Used by |
|---|---|---|
| `id` | string | all |
| `type` | `'rect' \| 'ellipse' \| 'pencil' \| 'text'` | all |
| `x` `y` | number | all (axis-aligned bounds origin) |
| `width` `height` | number | rect, ellipse, text; bounding box for pencil |
| `color` | string | all (CSS hex) |
| `strokeWidth` | number | all |
| `points` | `Y.Array<[x, y, p]>` | pencil only; `p` is pressure `0..1`, default `0.5` |
| `text` | `Y.Text` | text only |
| `deleted` | boolean | optional tombstone if you prefer not to `map.delete` |

Use `Y.Map.delete(id)` for erase. Do not keep a growing deleted list.

`points` are **relative to `(x, y)`**, same as the current app, so moving a stroke is one pair of number writes, not a rewrite of every point.

### 5.2 Creating a shape

```ts
doc.transact(() => {
  const el = new Y.Map()
  el.set('id', id)
  el.set('type', 'rect')
  el.set('x', x)
  el.set('y', y)
  el.set('width', 0)
  el.set('height', 0)
  el.set('color', color)
  el.set('strokeWidth', strokeWidth)
  elements.set(id, el)
  order.push([id])
}, ORIGIN_LOCAL)
```

`ORIGIN_LOCAL` is a unique object per client. `Y.UndoManager` tracks only that origin.

### 5.3 Pencil, two-phase

**While drawing (local user):**

- Keep points in a plain array on the tool.
- Paint them every frame on the **overlay** canvas.
- Broadcast a compact preview on awareness (`liveStroke: { color, width, points }`). Cap to the last 64 points or a Douglas-Peucker simplified copy so awareness stays small.

**On pointer up:**

- Run Perfect Freehand **only for rendering**, not for storage. Store the raw input points.
- Write the element + full `Y.Array` of points in **one** `transact`.
- Clear overlay and awareness `liveStroke`.

**Remote in-progress strokes:**

- Read other clients' `liveStroke` from awareness and paint on the overlay canvas.
- When their committed element appears in `elements`, drop the preview for that user.

Mid-stroke document streaming (appending to `Y.Array` on every move) is **v1.1**, not v1. It is more “live” but more expensive and harder to undo. Awareness preview is enough for a smooth feel.

### 5.4 Text

- On click with the text tool, create the element with empty `Y.Text`.
- Mount a DOM `<textarea>` positioned in screen space over the canvas. Bind it with a small Yjs text binding (or `yText.observe` + `insert`/`delete`).
- Remote users see `Y.Text` update live. That is the one case where CRDT character-level merge matters.

### 5.5 Move / resize

Select tool writes `x`, `y`, `width`, `height` (and for pencil, only `x`/`y`) inside a transact.

**Conflict UX:** last-writer-wins per field is correct for numbers. Two people dragging the same shape will look like a tug-of-war. For v1 that is acceptable. Optional v1.1: awareness `editingId` acts as a soft lock — if someone else has the shape captured, show a lock cursor and ignore local drag. Do not build a real distributed lock.

### 5.6 Eraser and delete

Eraser is **object erase**, matching the current app (not pixel erase):

- Hit-test in world space against the spatial index.
- `elements.delete(id)` and remove the id from `order`.
- Same path as Delete/Backspace on the selection.

### 5.7 Clear board

One transact: `elements.clear()` and `order.delete(0, order.length)`. This is undoable as a single local undo step for the person who cleared.

### 5.8 Undo / redo

```ts
const undoManager = new Y.UndoManager([elements, order], {
  trackedOrigins: new Set([ORIGIN_LOCAL]),
  captureTimeout: 300,
})
```

- Undo never reverts remote work.
- Group a full stroke, a completed drag, or a text typing burst as one item (`captureTimeout` plus explicit `stopCapturing` on pointer up).
- Keyboard: `Mod+Z` undo, `Mod+Shift+Z` redo.
- Do not reimplement history as `Element[][]`.

### 5.9 Z-order

`order` is a `Y.Array` of ids. Draw in array order. New shapes append. v1 has no explicit bring-to-front UI; keep the array so it can be added later.

---

## 6. Smoothness requirements

These are acceptance criteria, not suggestions.

### 6.1 Input

- Pointer events on the canvas: `pointerdown` / `pointermove` / `pointerup` / `pointercancel`, with `setPointerCapture`.
- `touch-action: none` on the board. Do not let the browser pan the page.
- Pencil samples on every `pointermove`. Do not debounce input.
- Drawing is predicted locally: overlay pixels must appear on the **next animation frame**, independent of WebSocket round-trip.

### 6.2 Rendering

- Scene canvas: committed elements + grid.
- Overlay canvas: local in-progress stroke, remote live strokes, selection box, remote cursors.
- Camera applied via `ctx.setTransform(scale, 0, 0, scale, tx, ty)` — do not redraw by mutating element coordinates.
- Grid drawn in world space, line width compensated by `1 / scale`.
- Pencil render: `getStroke(points, { size: strokeWidth, thinning: 0.6, smoothing: 0.5, streamline: 0.5 })` then `stroke` as a filled path. Cache the Path2D per element; invalidate when that element's points/color/width change.
- Viewport culling: skip elements whose AABB is outside the visible world rect (with a small pad).
- Hit testing: uniform grid spatial hash, rebuild incrementally on element add/move/delete. Do not loop every element on every click once there are hundreds.

### 6.3 React / Yjs boundary

- `Whiteboard` mounts once per room. It creates `Y.Doc`, provider, undo manager, and starts the rAF loop.
- A thin hook `useYjs(roomId)` returns `{ doc, provider, awareness, status }` for chrome (connection chip, presence).
- Shape lists are **not** in React. The renderer holds a `Map<id, PlainElement>` cache, updated by `observeDeep`.

### 6.4 Budgets (laptop, 2–4 concurrent users)

| Scenario | Target |
|---|---|
| Local pencil latency (pointer to pixel) | ≤ 1 frame (~16 ms) |
| Remote cursor | ≤ 50 ms after send, interpolating is optional |
| 2k pencil strokes on screen | 60 fps while panning |
| Room reconnect | restore from IndexedDB immediately, then merge |

If the scene canvas cannot hold 60 fps, first fix React subscriptions and Path2D cache. Do not add a WebGL renderer in v1.

### 6.5 Camera

- Trackpad / mouse wheel pans. `ctrl/meta + wheel` zooms toward the cursor (not the canvas origin).
- Space + drag pans, regardless of tool. Restore the previous tool on keyup.
- Toolbar `+` / `−` and a live zoom percentage, same as today.
- Clamp zoom to `[0.1, 5]`.

---

## 7. Presence and rooms

### 7.1 Join flow

Landing page (replace `RoomEntry`):

1. **Name** (required).
2. **Create room** — generate `roomId` (`nanoid(10)`), navigate to `/r/:roomId`.
3. **Join room** — existing id, navigate to `/r/:roomId`.
4. Persist display name in `localStorage` so the next visit prefills.

On entering a room:

- Create `Y.Doc`.
- Attach `IndexeddbPersistence(roomId, doc)`.
- Attach `HocuspocusProvider({ url, name: roomId, document: doc, awareness })`.
- Set local awareness: `{ userId, name, color, cursor: null, liveStroke: null, selectedIds: [] }`.
- Color: hash the userId into a curated palette (not `#${random}` which can be unreadable on white).

If the tab reloads, IndexedDB paints first, then the provider syncs.

### 7.2 Awareness state

```ts
type AwarenessState = {
  userId: string
  name: string
  color: string
  cursor: { x: number; y: number } | null   // world coords
  liveStroke: {
    color: string
    strokeWidth: number
    points: Array<[number, number, number]>
  } | null
  selectedIds: string[]
}
```

Draw other users' cursors as a small labeled pointer on the overlay. Draw a faint selection box around `selectedIds` in that user's color.

### 7.3 Connection UX

A small chip: `Connected` / `Reconnecting` / `Offline (local only)`. Offline is not an error — keep the board editable. On reconnect Hocuspocus merges.

### 7.4 Server

`apps/sync`:

- Hocuspocus on `PORT` (default `1234`).
- CORS allow the Vite origin.
- Database extension: load/store Yjs state by document name.
- Debounce writes (~2s) so a busy room does not flush every stroke point.
- `GET /health` → `ok`.
- Optional `HEAD /rooms/:id` for “does this room have a snapshot?” — not required if empty rooms are valid (they are).

No Socket.IO rooms map. The document name **is** the room.

---

## 8. UI and shortcuts

Keep the current toolbar layout: tools | color + width | undo/redo | zoom | clear.

| Key | Action |
|---|---|
| `V` | Select |
| `R` | Rectangle |
| `C` | Ellipse |
| `T` | Text |
| `P` | Pencil |
| `E` | Eraser |
| `Space` (hold) | Pan |
| `Mod+Z` | Undo |
| `Mod+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selection (ignore when a text field is focused) |
| `Mod+wheel` | Zoom |

Ignore shortcuts while the target is an input/textarea.

Visual:

- Dark tool chrome on a light board, same as today.
- Selection: dashed blue AABB.
- Grid: 40 world units, light gray.
- Landing: “Zort” wordmark + “A collaborative whiteboard” + join card.

---

## 9. Client data cache (plain objects)

Observers project Yjs into a render-friendly structure:

```ts
type Point = [x: number, y: number, p: number]

type Element =
  | {
      id: string
      type: 'rect' | 'ellipse'
      x: number; y: number
      width: number; height: number
      color: string
      strokeWidth: number
    }
  | {
      id: string
      type: 'pencil'
      x: number; y: number
      width: number; height: number
      color: string
      strokeWidth: number
      points: Point[]
    }
  | {
      id: string
      type: 'text'
      x: number; y: number
      width: number; height: number
      color: string
      strokeWidth: number
      text: string
    }
```

`width`/`height` for pencil are the AABB of points, recomputed when points change, used for culling and hit tests.

Hit test:

- Rect / ellipse: AABB (ellipse: also point-in-ellipse).
- Pencil: distance to segments vs `strokeWidth`, or AABB first then segments.
- Text: AABB.

Negative width/height (drag left/up) must be normalized for hit-test and draw, same as the current SVG code's `Math.abs` on ellipses.

---

## 10. Implementation phases

Ship in this order. Do not start phase N+1 until N is usable.

### Phase 0 — Scaffold

- pnpm workspaces, Vite React TS, Tailwind, shadcn button/input/card/slider/popover.
- Hocuspocus hello-world, health route.
- Env: `VITE_SYNC_URL=ws://localhost:1234`.

### Phase 1 — Local board (no network)

- Camera, grid, rAF renderer.
- All tools writing into a local `Y.Doc` (no provider yet).
- Undo manager, shortcuts, toolbar.
- This phase must feel better than the current app **alone**.

### Phase 2 — Persistence

- `y-indexeddb` per room.
- Reload keeps the drawing.

### Phase 3 — Sync

- HocuspocusProvider.
- Two browser profiles, same room: both see committed shapes.
- SQLite snapshots; kill the server, restart, third client still loads the board.

### Phase 4 — Presence

- Cursors, names, live-stroke overlay, connection chip.
- Presence bar on the room page.

### Phase 5 — Polish

- Cursor-centered zoom, space-to-pan, selection move, text binding.
- Perf pass: Path2D cache, culling, spatial hash.
- Empty/error states, invalid room id characters (`[A-Za-z0-9_-]{3,32}`).

---

## 11. Local development

```bash
pnpm install

# terminal 1
pnpm --filter sync dev    # Hocuspocus, ws://localhost:1234

# terminal 2
pnpm --filter web dev     # Vite, http://localhost:5173
```

```bash
# apps/web/.env
VITE_SYNC_URL=ws://localhost:1234

# apps/sync/.env
PORT=1234
DATABASE_PATH=./data/zort.sqlite
```

No Docker required for v1.

---

## 12. Testing

Automated tests will not prove “smooth,” but they should prove the document.

- Unit: geometry (AABB, ellipse hit, negative size normalize).
- Unit: CRDT helpers — two `Y.Doc`s, apply update, concurrent add of two shapes, both present; concurrent delete vs move, no throw; undo only local origin.
- Manual: two Chrome profiles, same room, draw over each other, reload, kill sync server mid-stroke, restore.

Do not write Playwright screenshot tests in v1 unless they stay off the hot path.

---

## 13. Acceptance checklist

v1 is done when all of the following are true:

- [ ] Two users can draw pencil, rect, ellipse, and text in the same room at the same time and both boards converge without refresh.
- [ ] A third user joining later sees the full board and live cursors.
- [ ] Reload in the same browser shows the board before the websocket connects.
- [ ] Server restart does not wipe rooms.
- [ ] Undo undoes only *my* last action, including a full pencil stroke as one step.
- [ ] Disconnecting the network still lets me draw; reconnect merges.
- [ ] Local pencil ink appears immediately; no waiting on the server.
- [ ] Panning a board with a few hundred strokes stays smooth.
- [ ] Shortcuts and toolbar match §8.
- [ ] No Socket.IO, no element arrays in Zustand, no SVG-as-scene-graph.

---

## 14. Legacy map (what to throw away)

| Legacy | Replacement |
|---|---|
| `store/useStore.ts` elements/history | `Y.Doc` + `Y.UndoManager` |
| `lib/socket.ts` / `server/index.ts` | Hocuspocus + awareness |
| `components/Whiteboard.tsx` SVG | Canvas renderer + tools |
| `Math.random()` ids | `nanoid` |
| Next.js App Router | Vite + React Router (or TanStack Router) |
| Framer Motion pan/zoom | Camera matrix on canvas |
| `vercel.json` socket rewrite | Static web + long-lived sync process |

Keep the product name, the join-card idea, the tool set, and the shortcut map. Everything else is new.

---

## 15. Decision log

| Decision | Choice | Rejected |
|---|---|---|
| CRDT | Yjs | Automerge (heavier snapshots), Loro (less React canvas prior art), tldraw/sync (would replace Zort’s renderer) |
| Transport | Hocuspocus | Socket.IO events (lost updates), raw `y-websocket` (no persistence hooks), PartyKit (extra Cloudflare runtime for v1), Liveblocks (SaaS) |
| Client | Vite + React 19 | Next.js 15 (SSR unused), solid/svelte (rewrite cost with no product gain) |
| Scene | Canvas 2D | SVG/React (current bottleneck), WebGL (premature) |
| Live strokes | Awareness preview | Streaming every point into Y.Array (v1.1) |
| Same-shape drag | LWW on x/y | Hard locks (v1.1 soft lock only if tug-of-war feels bad) |
