# cafe-stack ☕

A minimal Trello-style kanban board on the CAFE stack:

- **C** — [Cloudflare](https://workers.cloudflare.com/): assets served from a Worker, SPA fallback for deep links
- **A** — [Alchemy](https://alchemy.run/): the whole stack declared in one TypeScript program, deployed with `alchemy deploy`
- **F** — [Foldkit](https://foldkit.dev/): Elm-architecture frontend — Schema-defined Model, fact-named Messages, one exhaustive `update`
- **E** — [Effect](https://effect.website/): the effect runtime underneath it all

## The board

Three columns, drag cards within and across them — pointer *or* keyboard
(`space` to pick up, arrows to move, `tab` to change column, `escape` to cancel).
Add cards inline, delete on hover, and the board persists to `localStorage`
on every change.

Everything follows the same loop: something happens, a `Message` records the
fact, the pure `update` moves the `Model` forward, and side effects run as
`Command`s (UUID generation, board persistence, input focus) — never in the
view.

## Develop

```sh
bun install
bun run dev      # alchemy dev — Vite HMR + live Cloudflare bindings
```

## Test / typecheck / build

```sh
bun run test
bun run typecheck
bun run build
```

## Deploy

```sh
bun run deploy   # alchemy deploy — build and ship to Cloudflare
bun run destroy  # alchemy destroy — tear it all down
```

## Layout

| File | Purpose |
| --- | --- |
| `alchemy.run.ts` | The Stack: one `Cloudflare.Website.Foldkit` declaration |
| `src/model.ts` | `Card` / `Column` / `Model` schemas + `moveCard` |
| `src/message.ts` | The fact-named `Message` union |
| `src/update.ts` | The pure update, plus the `DragAndDrop` child fold |
| `src/view.ts` | The board: columns, cards, ghost, drop preview |
| `src/command.ts` | Side effects: `GenerateCardId`, `SaveBoard`, `FocusAddCardInput` |
| `src/main.ts` | Flags (localStorage bootstrap), `init`, subscriptions |
| `src/entry.ts` | Runtime bootstrap (`Runtime.makeApplication` + `Runtime.run`) |
| `src/scene.test.ts` | Scene + story tests |
| `FOLDKIT.md` | Foldkit conventions (owned by Foldkit, replaced on upgrade) |

## Acknowledgements

Scaffolded from [foldkit/foldkit](https://github.com/foldkit/foldkit)'s `kanban`
example, then distilled — fractional-indexing, card descriptions, and
screen-reader announcements removed for minimalism. Drag & drop
(accessible, keyboard-driven) comes from `@foldkit/ui`'s `DragAndDrop` submodel.