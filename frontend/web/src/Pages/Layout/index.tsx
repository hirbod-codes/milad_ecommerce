import { Outlet } from "react-router";
import { ConfigurationContextWrapper } from "../../Contexts/Configuration/ConfigurationContextWrapper";
import { AppBar } from "@/src/Components/AppBar";
import { memo, useMemo } from "react";
import { FeedbackWrapper } from "@/src/Contexts/Feedback/FeedbackWrapper";
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
    return (
        <Stack direction='vertical' stackProps={{ className: 'h-screen w-screen overflow-hidden mx-0 p-2' }}>
            <AppBar />
            <div className="flex-grow h-0">
                <Outlet />
            </div>
        </Stack>
    )
})
