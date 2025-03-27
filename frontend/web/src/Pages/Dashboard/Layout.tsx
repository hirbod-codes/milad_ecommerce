import { Stack } from "@/src/Components/Base/Stack"
import { Navigation } from "@/src/Components/Navigation"
import { Outlet } from "react-router"

export function Layout() {
    console.log('Dashboard')

    return (
        <Stack stackProps={{ className: 'size-full' }}>
            <div className="w-[64px] h-full">
                <Navigation />
            </div>

            <Outlet />
        </Stack>
    )
}

