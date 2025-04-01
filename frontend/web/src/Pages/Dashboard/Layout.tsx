import { Stack } from "@/src/Components/Base/Stack"
import { Navigation } from "@/src/Components/Navigation"
import { useContext, useEffect, useReducer, useRef } from "react"
import { Outlet } from "react-router";
import { AuthContext } from "@/src/Contexts/Auth/AuthContext";

export const LAYOUT_RERENDER = 'layout_rerender'

export function Layout() {
    const auth = useContext(AuthContext)
    const ref = useRef<HTMLDivElement>(null)
    const grownRef = useRef<HTMLDivElement>(null)

    const [, rerender] = useReducer(x => x + 1, 0)

    console.log('Dashboard Layout', { auth })

    useEffect(() => {
        if (ref.current) {
            grownRef.current.style.width = (ref.current.getBoundingClientRect().width - 72) + 'px'
            rerender()
        }
    }, [ref, ref.current])

    return (
        <Stack stackProps={{ className: 'size-full', }} stackRef={ref}>
            <div className="w-[72px] h-full">
                <Navigation />
            </div>

            <div className="h-full" ref={grownRef}>
                <Outlet />
            </div>
        </Stack >
    )
}
