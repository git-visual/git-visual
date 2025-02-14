import { useKonami } from "react-konami-code"
import type { MetaFunction } from "@remix-run/node"
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError
} from "@remix-run/react"

import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/animations.css"
import { Code } from "./components/util"
import tailwindStylesheet from "~/tailwind.css"
import { ThemeProvider, cn, usePrefersLightMode } from "./styling"
import datePickerStyles from "react-datepicker/dist/react-datepicker.css"

export const meta: MetaFunction = () => {
  return [{ title: "Git Truck" }]
}

export function links() {
  return [
    ...[varsStyles, indexStyles, tailwindStylesheet, datePickerStyles].map((x) => ({
      rel: "stylesheet",
      href: x
    })),
    {
      rel: "favicon",
      type: "image/x-icon",
      href: "favicon.ico"
    },
    {
      rel: "preconnect",
      href: "https://fonts.googleapis.com"
    },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com"
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Roboto+Mono:wght@400;700&display=swap"
    }
  ]
}

export default function App() {
  useKonami(() => window.open("https://fruit-rush.joglr.dev", "_self"))

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <ThemeProvider>
        <Body>
          <Outlet />
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
        </Body>
      </ThemeProvider>
    </html>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  const prefersLightMode = usePrefersLightMode()
  return (
    <body
      className={cn("bg-gray-200 text-gray-700 dark:bg-gray-900 dark:text-gray-300", {
        dark: !prefersLightMode
      })}
    >
      {children}
    </body>
  )
}

export const ErrorBoundary = () => {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <html lang="en">
        <head>
          <title>Oops! An error wasn&apos;t handled</title>
          <Meta />
          <Links />
        </head>
        <body>
          <h1>Error: {error.status}</h1>
          <Code>{error.data.message}</Code>
          <Scripts />
        </body>
      </html>
    )
  } else if (error instanceof Error) {
    return (
      <html lang="en">
        <head>
          <title>Oops! An error wasn&apos;t handled</title>
          <Meta />
          <Links />
        </head>
        <body>
          <h1>{error.message}</h1>
          <Code>{error.stack}</Code>
          <Scripts />
        </body>
      </html>
    )
  } else {
    return null
  }
}
