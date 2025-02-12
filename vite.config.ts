import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import pkg from "./package.json"
import { cjsInterop } from "vite-plugin-cjs-interop"

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["duckdb-async"]
    }
  },
  ssr: {
    external: ["duckdb-async"]
  },
  optimizeDeps: {
    entries: [],
    exclude: ["@mapbox/node-pre-gyp", "aws-sdk", "nock", "mock-aws-s3"]
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    cjsInterop({
      dependencies: process.env.NODE_ENV === "production" ? ["@mdi/react"] : []
    })
  ],
  define: {
    "process.env.PACKAGE_VERSION": JSON.stringify(pkg.version)
  },
  test: {
    globals: true,
    exclude: ["e2e", "node_modules"]
  }
})
