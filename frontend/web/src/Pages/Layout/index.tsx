import { Outlet, useOutlet } from "react-router";
import { ConfigurationContextWrapper } from "../../Contexts/Configuration/ConfigurationContextWrapper";
import { AppBar } from "@/src/Components/AppBar";
import { memo, useEffect, useMemo, useReducer } from "react";
import { FeedbackWrapper } from "@/src/Contexts/Feedback/FeedbackWrapper";
import { Stack } from "@/src/Components/Base/Stack";
import { subscribe } from "@/src/Lib/Events";
import { Auth } from "@/src/Backend/Auth/Auth";
import { getAuthApiUrl } from "@/src/Backend/helpers";

export const LAYOUT_RERENDER = 'layout_rerender'

export function Layout() {
    console.log('Layout')

    const [x, rerender] = useReducer(x => x + 1, 0)

    subscribe(LAYOUT_RERENDER, (e) => {
        if ((e as CustomEvent)?.detail)
            Auth.login((e as CustomEvent)?.detail)
        rerender();
    })

    const feedbackWrapper = useMemo(() =>
        <FeedbackWrapper key={x}>
            <Stack direction='vertical' stackProps={{ className: 'h-screen w-screen overflow-hidden mx-0 p-2' }}>
                <AppBar />
                <div className="flex-grow h-0">
                    <Outlet key={x} />
                </div>
            </Stack>
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
                        Auth.login(token)
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

const App = memo(function App() {
    console.log('App')

    return (
        <Stack direction='vertical' stackProps={{ className: 'h-screen w-screen overflow-hidden mx-0 p-2' }}>
            <AppBar />
            <div className="flex-grow h-0">
                <Outlet />
            </div>
        </Stack>
    )
})
