import { HydratedRouter } from "react-router/dom";
import { startTransition, StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"

function hydrate() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    )
  })
}

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(hydrate)
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  setTimeout(hydrate, 1)
}
