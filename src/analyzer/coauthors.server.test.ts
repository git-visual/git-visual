import { it, expect, describe } from "vitest"
import { getCoAuthors } from "./coauthors.server"
import type { Person } from "./model"

describe("getCoAuthors", () => {
  it("should return an empty array when there are no co-authors", () => {
    const description = "This is a commit message without co-authors."
    const result = getCoAuthors(description)
    expect(result).toEqual([])
  })

  it("should return a single co-author", () => {
    const description = "This is a commit message.\n\nCo-authored-by: John Doe <john.doe@example.com>"
    const result: Person[] = getCoAuthors(description)
    expect(result).toEqual([{ name: "John Doe", email: "john.doe@example.com" }])
  })

  it("should return multiple co-authors", () => {
    const description = `This is a commit message.

    Co-authored-by: John Doe <john.doe@example.com>
    Co-authored-by: Jane Smith <jane.smith@example.com>`
    const result: Person[] = getCoAuthors(description)
    expect(result).toEqual([
      { name: "John Doe", email: "john.doe@example.com" },
      { name: "Jane Smith", email: "jane.smith@example.com" }
    ])
  })

  it("should handle invalid co-author entries gracefully", () => {
    const description = `This is a commit message.

    Co-authored-by: John Doe <john.doe@example.com>
    Co-authored-by: Invalid Entry`
    const result: Person[] = getCoAuthors(description)
    expect(result).toEqual([{ name: "John Doe", email: "john.doe@example.com" }])
  })

  it("should trim whitespace from co-author names", () => {
    const description = `This is a commit message.

    Co-authored-by: John Doe   <john.doe@example.com>`
    const result: Person[] = getCoAuthors(description)
    expect(result).toEqual([{ name: "John Doe", email: "john.doe@example.com" }])
  })

  it("Should return none", () => {
    const actual = getCoAuthors("lorem ipsum\n\nCo-authored-by:")
    expect(actual.length).toBe(0)
  })

  it("Should return none when empty input", () => {
    const actual = getCoAuthors("")
    expect(actual.length).toBe(0)
  })

  it("Should return 2 authors", () => {
    const sampleDescription =
      "did some stuff\n\nCo-authored-by: Bob Bobby <bob@example.com>\nCo-authored-by: Alice Lmao <alice@example.com>"
    const expected = [
      {
        name: "Bob Bobby",
        email: "bob@example.com"
      },
      {
        name: "Alice Lmao",
        email: "alice@example.com"
      }
    ]
    const actual = getCoAuthors(sampleDescription)
    expect(actual).toStrictEqual(expected)
  })
  it("should ignore invalid co-author entries", () => {
    const description = `This is a commit message.

    Co-authored-by: John Doe <john.doe@example.com>
    Co-authored-by: Invalid Entry`
    const result: Person[] = getCoAuthors(description)
    expect(result).toEqual([{ name: "John Doe", email: "john.doe@example.com" }])
  })
})
