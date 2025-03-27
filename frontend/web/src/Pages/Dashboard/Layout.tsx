import { Stack } from "@/src/Components/Base/Stack"
import { Navigation } from "@/src/Components/Navigation"
import { useEffect, useRef } from "react"
import { Outlet } from "react-router"

export function Layout() {
    return (
        <Stack stackProps={{ className: 'size-full', }}>
            <div className="w-[64px] h-full">
                <Navigation />
            </div>

            <div className="flex-grow h-full">
                <Outlet />
            </div>
        </Stack >
    )
}

