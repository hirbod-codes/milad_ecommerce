import { Outlet } from "react-router";
import { ConfigurationContextWrapper } from "../../Contexts/Configuration/ConfigurationContextWrapper";
import { AppBar } from "@/src/Components/AppBar";
import { useEffect, useMemo, useReducer } from "react";
import { FeedbackWrapper } from "@/src/Contexts/Feedback/FeedbackWrapper";
import { Stack } from "@/src/Components/Base/Stack";
import { subscribe } from "@/src/Lib/Events";
import { Auth } from "@/src/Backend/Auth/Auth";
import { getAuthApiUrl } from "@/src/Backend/helpers";
import { AuthContextWrapper } from "@/src/Contexts/Auth/AuthContextWrapper";

export const LAYOUT_RERENDER = 'layout_rerender'

export function Layout() {
    console.log('Layout')

    const [x, rerender] = useReducer(x => x + 1, 0)

    subscribe(LAYOUT_RERENDER, (e) => {
        if ((e as CustomEvent)?.detail)
            Auth.setToken((e as CustomEvent)?.detail)
        rerender();
    })

    const app = useMemo(() =>
        <Stack key={x} direction='vertical' stackProps={{ className: 'h-screen w-screen overflow-hidden mx-0 p-2' }}>
            <AppBar />
            <div className="flex-grow h-0">
                <Outlet key={x} />
            </div>
        </Stack>
        , [x])

    const auth = useMemo(() =>
        <AuthContextWrapper key={x}>
            {app}
        </AuthContextWrapper>
        , [x])

    const feedbackWrapper = useMemo(() =>
        <FeedbackWrapper key={x}>
            {auth}
        </FeedbackWrapper>
        , [x])

    useEffect(() => {
        if (!Auth.isAuthenticated())
            fetch(`${getAuthApiUrl()}/auth/tokens/retrieve-access-token`, {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
                .then(async r => {
                    if (r.ok && r.headers.get('content-type')?.includes('application/json')) {
                        const { token } = await r.json()
                        Auth.setToken(token)
                        rerender()
                    }
                })
    }, [])

    return (
        <ConfigurationContextWrapper key={x}>
            {feedbackWrapper}
        </ConfigurationContextWrapper>
    )
}
