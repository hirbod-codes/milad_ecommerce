import { Outlet } from "react-router";
import { ConfigurationContextWrapper } from "../../Contexts/Configuration/ConfigurationContextWrapper";
import { AppBar } from "@/src/Components/AppBar";
import { useMemo } from "react";
import { FeedbackWrapper } from "@/src/Contexts/Feedback/FeedbackWrapper";

export function Layout() {
    console.log('Layout')

    const app = useMemo(() => <><AppBar /><Outlet /></>, [])
    const feedbackWrapper = useMemo(() => <FeedbackWrapper>{app}</FeedbackWrapper>, [])

    return (
        <ConfigurationContextWrapper>
            {feedbackWrapper}
        </ConfigurationContextWrapper>
    )
}
