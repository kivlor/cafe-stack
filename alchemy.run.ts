import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"

// The Foldkit app: index.html + src/ at the project root, built with Vite
// and served from a Cloudflare Worker with SPA fallback for deep links.
export const Website = Cloudflare.Website.Foldkit("cafe-stack-web")

export default Alchemy.Stack(
  "cafe-stack",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const website = yield* Website

    return {
      url: website.url,
    }
  }),
)
