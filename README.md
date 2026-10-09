# cafe-stack ☕

A web app on the CAFE stack:

- **C** — [Cloudflare](https://workers.cloudflare.com/): hosting (Worker + static assets)
- **A** — [Alchemy](https://alchemy.run/): infrastructure-as-Effect, deployed from TypeScript
- **F** — [Foldkit](https://foldkit.dev/): Elm-architecture frontend built on Effect
- **E** — [Effect](https://effect.website/): the TypeScript effect runtime underneath it all

A Foldkit counter app (Model → Message → update → view) deployed to Cloudflare
with a single `Cloudflare.Website.Foldkit` declaration.

## Develop

```sh
bun install
bun run dev      # alchemy dev — Vite dev server with Foldkit HMR + live bindings
```

## Test / typecheck / build

```sh
bun run test
bun run typecheck
bun run build
```

## Deploy

```sh
bun run deploy   # alchemy deploy — build the app and ship it to Cloudflare
bun run destroy  # alchemy destroy — tear everything down
```

## Layout

| File | Purpose |
| --- | --- |
| `src/main.ts` | The app: Model, Messages, `update`, `init`, `view` |
| `src/entry.ts` | Runtime bootstrap (`Runtime.makeApplication` + `Runtime.run`) |
| `src/scene.test.ts` | Scene tests driving the real `update`/`view` |
| `vite.config.ts` | Vite with the Foldkit + Tailwind plugins |
| `alchemy.run.ts` | The Stack: one `Cloudflare.Website.Foldkit` declaration |
| `FOLDKIT.md` | Foldkit conventions (owned by Foldkit, replaced on upgrade) |
