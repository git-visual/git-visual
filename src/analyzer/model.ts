import type { ANALYZER_CACHE_MISS_REASONS } from "./git-caller.server"

export type Repository = {
  /**
   * Relative path to the base directory that Git Truck was started in
   */
  path: string
  /**
   * Full path to the repository
   */
  // fullPath: string // TODO: Implement browsing, requires new routing
  /**
   * Full path to the parent directory of the repository
   */
  parentDirPath: string
  /**
   * Directory name of the repository
   */
  name: string
} & (
  | {
      status: "Success"
      isAnalyzed: true
      refs: GitRefs
      reasons: ANALYZER_CACHE_MISS_REASONS[]
      analyzedHeads: Record<string, boolean>
      data: AnalyzerData
      currentHead: string
    }
  | {
      name: string
      // fullPath: string // TODO: Implement browsing, requires new routing
      status: "Loading"
    }
  | {
      status: "Success"
      isAnalyzed: false
      refs: GitRefs
      reasons: ANALYZER_CACHE_MISS_REASONS[]
      analyzedHeads: Record<string, boolean>
      data: null
      currentHead: string
    }
  | {
      status: "Error"
      errorMessage: string
    }
)

export type GitObject = GitBlobObject | GitTreeObject

export interface AbstractGitObject {
  type: "blob" | "tree" | "commit"
  hash: string
}

export interface TruckUserConfig {
  log?: string
  branch?: string
  out?: string
  path?: string
  unionedAuthors?: string[][]
  hiddenFiles?: string[]
  invalidateCache?: boolean
  colorSeed?: string
}

export type RawGitObjectType = "blob" | "tree" | "commit" | "tag"
export type RawGitObject = {
  hash: string
  type: RawGitObjectType
  path: string
  value?: string
  size?: number
}

export interface ArgsOptions {
  log?: string
  out?: string
  branch?: string
  path: string
}

// Bump this if changes are made to this file
export const AnalyzerDataInterfaceVersion = 16

export interface AnalyzerData {
  cached: boolean
  interfaceVersion: typeof AnalyzerDataInterfaceVersion
  hiddenFiles: string[]
  repo: string
  branch: string
  commit: GitCommitObject
  authors: string[]
  authorsUnion: string[]
  currentVersion: string
  lastRunEpoch: number
  commits: Record<string, GitLogEntry>
}

type RefType = "Branches" | "Tags"

export type GitRefs = Record<RefType, Record<string, string>>

export interface GitBlobObject extends AbstractGitObject {
  type: "blob"
  name: string
  path: string
  sizeInBytes: number
}

export interface GitTreeObject extends AbstractGitObject {
  type: "tree"
  name: string
  path: string
  children: (GitTreeObject | GitBlobObject)[]
}

export interface GitCommitObject extends AbstractGitObject {
  type: "commit"
  tree: GitTreeObject
  parent: string
  parent2: string | null
  author: PersonWithTime
  committer: PersonWithTime
  message: string
  description: string
  coauthors: Person[]
  fileCount?: number
}

export type GitCommitObjectLight = Omit<GitCommitObject, "tree"> & {
  tree: string
}

export interface Person {
  name: string
  email: string
}

export type PersonWithTime = Person & {
  timestamp: number
  timezone: string
}

export type ModeType = "create" | "modify" | "delete"

export interface FileChange {
  path: string
  isBinary: boolean
  insertions: number
  deletions: number
  mode: ModeType
}

export interface DBFileChange {
  commithash: string
  insertions: number
  deletions: number
  filepath: string
}

export interface CommitDTO {
  author: string
  committertime: number
  authortime: number
  hash: string
}

export interface CompletedResult {
  repo: string
  branch: string
  time: number
}

export interface FullCommitDTO extends CommitDTO {
  body: string
  message: string
  fileChanges: FileChange[]
}

export interface GitLogEntry extends CommitDTO {
  coauthors: Person[]
  fileChanges: FileChange[]
}

export interface RenameEntry {
  fromname: string | null
  toname: string | null
  timestamp: number
  timestampauthor: number
  timestampEnd?: number
}

export interface RenameInterval {
  fromname: string | null
  toname: string | null
  timestamp: number
  timestampend: number
}

export interface FileModification {
  path: string
  timestamp: number
  timestampauthor: number
  type: ModeType
}
