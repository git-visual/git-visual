import { Route } from "./+types/test"

export const loader = async ({ context }: Route.LoaderArgs) => {
  return { version: context.version }
}
