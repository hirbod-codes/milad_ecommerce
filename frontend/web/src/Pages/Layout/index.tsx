import { Outlet } from "react-router";
import { ConfigurationContextWrapper } from "../../Contexts/Configuration/ConfigurationContextWrapper";
import { AppBar } from "@/src/Components/AppBar";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FeedbackWrapper } from "@/src/Contexts/Feedback/FeedbackWrapper";
import { Navigation } from "@/src/Components/Navigation";
import { Stack } from "@/src/Components/Base/Stack";

export function Layout() {
    console.log('Layout')

    const feedbackWrapper = useMemo(() => <FeedbackWrapper><App /></FeedbackWrapper>, [])

    return (
        <ConfigurationContextWrapper>
            {feedbackWrapper}
        </ConfigurationContextWrapper>
    )
}

const App = memo(function App() {
    const stackRef = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (stackRef.current) {
            const rect = stackRef.current?.getBoundingClientRect()
            let w = rect?.width
            if (w)
                setWidth(`${w - 64}px`)
        }
    }, [stackRef.current])

    return (
        <Stack direction='vertical' stackProps={{ className: 'h-screen w-screen overflow-hidden mx-0' }}>
            <Stack stackRef={stackRef} stackProps={{ className: 'flex-grow w-full overflow-hidden p-2' }}>
                <div className="w-[64px] h-full">
                    <Navigation />
                </div>

                <Stack direction='vertical' stackProps={{ className: 'flex-grow h-full relative overflow-hidden bg-surface', style: { width } }}>
                    <AppBar />
                    <div className="flex-grow h-0">
                        <Outlet />
                    </div>
                </Stack>
            </Stack>
        </Stack>
    )
})
