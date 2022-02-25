import { Spacer } from "./Spacer"
import { makePercentResponsibilityDistribution } from "./Chart"
import { Box, BoxTitle, CloseButton } from "./util"
import { useStore } from "../StoreContext"

export function Details() {
  const { setClickedBlob, clickedBlob } = useStore()
  if (clickedBlob === null) return null
  return (
    <Box>
      <BoxTitle>
        {clickedBlob.name}
        <CloseButton
          onClick={() => {
            setClickedBlob(null)

            console.log("clickety clooty i'm coming for that close button")
          }}
        >
          &times;
        </CloseButton>
      </BoxTitle>
      <div>Line count: {clickedBlob.noLines}</div>
      <Spacer xl />
      <div>Author distribution:</div>
      {Object.entries(makePercentResponsibilityDistribution(clickedBlob))
        .sort((a, b) => (a[1] < b[1] ? 1 : -1))
        .map(([author, contrib]) => (
          <div key={`${author}${contrib}`}>
            <b>{author}:</b> {(contrib * 100).toFixed(2)}%
          </div>
        ))}
    </Box>
  )
}
