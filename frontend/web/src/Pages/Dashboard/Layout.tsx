import { Stack } from "@/src/Components/Base/Stack"
import { Navigation } from "@/src/Components/Navigation"
import { useContext, useEffect, useReducer, useRef } from "react"
import { Outlet } from "react-router";
import { ConfigurationContextWrapper } from "@/src/Contexts/Configuration/ConfigurationContextWrapper";
import { useMemo } from "react";
import { FeedbackWrapper } from "@/src/Contexts/Feedback/FeedbackWrapper";
import { subscribe } from "@/src/Lib/Events";
import { Auth } from "@/src/Backend/Auth/Auth";
import { AuthContextWrapper } from "@/src/Contexts/Auth/AuthContextWrapper";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";

export const LAYOUT_RERENDER = 'layout_rerender'

// export function Layout() {
//     console.log('Layout')

//     const [x, rerender] = useReducer(x => x + 1, 0)

//     subscribe(LAYOUT_RERENDER, (e) => {
//         if ((e as CustomEvent)?.detail)
//             Auth.setToken((e as CustomEvent)?.detail)
//         rerender();
//     })

//     const app = useMemo(() => <App />, [x])

//     const auth = useMemo(() =>
//         <AuthContextWrapper key={x}>
//             {app}
//         </AuthContextWrapper>
//         , [x])

//     const feedbackWrapper = useMemo(() =>
//         <FeedbackWrapper key={x}>
//             {auth}
//         </FeedbackWrapper>
//         , [x])

//     return (
//         <ConfigurationContextWrapper key={x}>
//             {feedbackWrapper}
//         </ConfigurationContextWrapper>
//     )
// }

export function Layout() {
    const auth = useContext(AuthContext)
    const ref = useRef<HTMLDivElement>(null)
    const grownRef = useRef<HTMLDivElement>(null)

    const [, rerender] = useReducer(x => x + 1, 0)

    console.log('Dashboard Layout', { auth })

    useEffect(() => {
        if (ref.current) {
            grownRef.current.style.width = (ref.current.getBoundingClientRect().width - 64) + 'px'
            rerender()
        }
    }, [ref, ref.current])

    return (
        <Stack stackProps={{ className: 'size-full', }} stackRef={ref}>
            <div className="w-[64px] h-full">
                <Navigation />
            </div>

            <div className="h-full" ref={grownRef}>
                <Outlet />
            </div>
        </Stack >
    )
}
