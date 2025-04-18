import { useContext, useEffect } from "react"
import { useSearchParams } from "react-router"
import { FeedbackContext } from "@/src/Contexts/Feedback/FeedbackContext"
import { Stack } from "@/src/Components/Base/Stack"

export function Category() {
    const feedback = useContext(FeedbackContext)

    const [queryVars, setQueryVars] = useSearchParams()
    const category = queryVars.get('category')

    useEffect(() => {
        if (category) {
            // 
        }
    }, [])

    return (
        <Stack direction="vertical">
        </Stack>
    )
}
