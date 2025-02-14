#!/usr/bin/env node

import express from "express"
import compression from "compression"
import morgan from "morgan"
import { createRequestHandler } from "@react-router/express"
import pkg from "../package.json"
import open from "open"
import { GitCaller } from "./analyzer/git-caller.server"
import { getArgsWithDefaults, parseArgs } from "./analyzer/args.server"
import { getPathFromRepoAndHead } from "./util"
import { describeAsyncJob, getDirName, getLatestVersion, isValidURI } from "./analyzer/util.server"
import { log, setLogLevel } from "./analyzer/log.server"
import InstanceManager from "./analyzer/InstanceManager.server"

async function main() {
  const args = parseArgs()
  if (args?.log) {
    setLogLevel(args.log as string)
  }
  const options = getArgsWithDefaults()

  // Soft clear the console
  process.stdout.write("\u001b[2J\u001b[0;0H")
  console.log()

  console.log(`Git Truck version ${pkg.version} (${process.env.NODE_ENV ?? "development"})`)

  if (args.h || args.help) {
    console.log()
    console.log(`See ${pkg.homepage} for usage instructions.`)
    console.log()
    process.exit(0)
  }
  const getPortLib = await import("get-port")
  const getPort = getPortLib.default
  const port = await getPort({
    port: [...getPortLib.portNumbers(3000, 4000)]
  })

  // Serve application build

  const onListen = async () => {
    const url = `http://localhost:${port}`

    const [extension, extensionError] = await describeAsyncJob({
      job: async () => {
        // If CWD or path argument is a git repo, go directly to that repo in the visualizer
        if (await GitCaller.isGitRepo(options.path)) {
          const repoName = getDirName(options.path)
          if (repoName) {
            const currentHead = await GitCaller._getRepositoryHead(options.path)
            return `/${getPathFromRepoAndHead(repoName, currentHead)}`
          } else return ""
        }
      },
      beforeMsg: "Checking for git repo",
      afterMsg: "Done checking for git repo",
      errorMsg: "Failed to check for git repo"
    })

    if (extensionError) {
      log.error(extensionError)
    }

    if (!args.headless && process.env.NODE_ENV === "development") {
      args.headless = true
    }
    const openURL = url + (extension && isValidURI(extension) ? extension : "")

    if (!args.headless) {
      log.debug(`Opening ${openURL}`)
      await describeAsyncJob({
        job: () => open(openURL),
        beforeMsg: "Opening Git Truck in your browser",
        afterMsg: "Opened Git Truck in your browser",
        errorMsg: `Failed to open Git Truck in your browser. To continue, open this link manually:\n\n${openURL}\n`
      })
    } else {
      console.log(`Application available at ${url}`)
    }
  }

  const viteDevServer =
    process.env.NODE_ENV === "production"
      ? undefined
      : await import("vite").then((vite) =>
          vite.createServer({
            server: { middlewareMode: true }
          })
        )

  const latestVersion = await getLatestVersion()

  const reactRouterHandler = createRequestHandler({
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
      : await import("../build/server/index.js"),
    getLoadContext() {
      return {
        version: pkg.version,
        latestVersion: latestVersion
      }
    }
  })

  const app = express()

  app.use(compression())

  // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
  app.disable("x-powered-by")

  // handle asset requests
  if (viteDevServer) {
    app.use(viteDevServer.middlewares)
  } else {
    // Vite fingerprints its assets so we can cache forever.
    app.use(
      "/assets",
      express.static("build/client/assets", {
        immutable: true,
        maxAge: "1y",
        setHeaders(res, path, stat) {
          console.log("checking file extension")
          if (path.endsWith(".js")) {
            console.log("setting js header")
            res.setHeader("Content-Type", "application/javascript; charset=utf-8")
          }
        }
      })
    )
  }

  // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // more aggressive with this caching.
  app.use(express.static("build/client", { maxAge: "1h" }))

  app.use(morgan("tiny"))

  // handle SSR requests
  app.all("*", reactRouterHandler)

  const server = process.env.HOST ? app.listen(port, process.env.HOST, onListen) : app.listen(port, onListen)
  ;["SIGTERM", "SIGINT"].forEach((signal) => {
    process.once(signal, stopHandler)
  })

  process.on("uncaughtException", stopHandler)

  async function stopHandler() {
    const promise = InstanceManager.closeAllDBConnections()
    log.info("Shutting down server")
    server.close(console.error)
    log.info("Web server shut down")
    await describeAsyncJob({
      job: () => promise,
      beforeMsg: "Stopping Git Truck...",
      afterMsg: "Successfully stopped Git Truck",
      errorMsg: "Failed to stop Git Truck"
    })
  }
}

main()
