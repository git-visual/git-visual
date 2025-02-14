/* eslint-disable @typescript-eslint/no-var-requires */
import { execSync } from "child_process"

const hasUncommittedChanges = execSync("git status --porcelain", { stdio: "pipe" })?.toString().trim().length > 0

async function main() {
  if (hasUncommittedChanges) {
    console.error("You have uncommitted changes. Please commit or stash them before publishing.")
    process.exit(1)
  }

  if (!process.argv[2]) {
    console.error("You must specify a OTP number to publish.")
    process.exit(1)
  }

  const commitHash = execSync("git rev-parse --short HEAD", { stdio: "pipe" }).toString().trim()
  const versionTag = `0.0.0-${commitHash}`
  const tag = process.argv[3] ?? "experimental"
  console.log(`Tagging version ${versionTag}...`)
  execSync(`npm version ${versionTag} --no-git-tag-version`, { stdio: "pipe" })
  console.log(`Tagged version ${versionTag}`)
  console.log(`Publishing version ${versionTag} to git-truck@${tag}...`)
  execSync(`npm publish --otp ${process.argv[2]} --tag ${tag}`, { stdio: "inherit" })
  console.log(`Published version ${versionTag} to git-truck@${tag}`)
  console.log("Cleaning up...")
  cleanUp()
  console.log("Cleaned up")
}

main().catch((err) => {
  cleanUp()
  console.error(err)
  process.exit(1)
})

process.on("SIGTERM", cleanUp)

function cleanUp() {
  if (!hasUncommittedChanges) execSync(`git checkout HEAD -- package.json package-lock.json`, { stdio: "pipe" })
}
