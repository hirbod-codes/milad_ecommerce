import { Stack } from "@/src/Components/Base/Stack"
import { Navigation } from "@/src/Components/Navigation"
import { useEffect, useReducer, useRef } from "react"
import { Outlet } from "react-router"

export function Layout() {
    const ref = useRef<HTMLDivElement>(null)
    const grownRef = useRef<HTMLDivElement>(null)

    const [, rerender] = useReducer(x => x + 1, 0)

    console.log('Dashboard Layout')

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

