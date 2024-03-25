import { createContext, useContext } from "react"
import type { RepoData } from "~/routes/$repo.$"

export const DataContext = createContext<RepoData | undefined>(undefined)

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within a DataContext")
  }
  if (context.repo.status !== "Success" || context.repo.isAnalyzed === false) {
    throw new Error("Repo is not analyzed")
  }

  // Force typescript to infer the type of the repo
  return {
    ...context,
    repo: context.repo
  }
}
