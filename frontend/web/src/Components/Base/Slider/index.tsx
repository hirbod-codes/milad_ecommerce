import { Point } from "@/src/Lib/Math"
import { cn } from "@/src/shadcn/lib/utils"
import { ComponentProps, PointerEvent, ReactNode, useEffect, useRef, useState } from "react"

export type SliderProps = {
    defaultProgress?: number,
    onProgressChanged?: (progress: number) => void | Promise<void>,
    onProgressChanging?: (progress: number) => void | Promise<void>,
    containerProps?: ComponentProps<'div'>,
    sliderProps?: ComponentProps<'div'>,
    children?: ReactNode
}

export function Slider({ defaultProgress, onProgressChanged, onProgressChanging, containerProps, sliderProps, children }: SliderProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const sliderRef = useRef<HTMLDivElement>(null)

    const [pointerDown, setPointerDown] = useState<boolean>(false)

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        setPointerDown(true)

        if (!containerRef.current || !sliderRef.current)
            return

        const p = getPointFromEvent(e)
        const cBoundaries = containerRef.current.getBoundingClientRect()
        const sBoundaries = sliderRef.current.getBoundingClientRect()

        const progressLength = Math.min(Math.max(cBoundaries.left, p.x), cBoundaries.right) - cBoundaries.left
        const left = progressLength - (sBoundaries.width / 2)

        sliderRef.current.style.left = `${left}px`

        if (onProgressChanged)
            onProgressChanged(100 * (progressLength / cBoundaries.width))
    }

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!pointerDown || !containerRef.current || !sliderRef.current)
            return

        const p = getPointFromEvent(e)
        const cBoundaries = containerRef.current.getBoundingClientRect()
        const sBoundaries = sliderRef.current.getBoundingClientRect()

        const progressLength = Math.min(Math.max(cBoundaries.left, p.x), cBoundaries.right) - cBoundaries.left
        const left = progressLength - (sBoundaries.width / 2)

        sliderRef.current.style.left = `${left}px`

        if (onProgressChanging)
            onProgressChanging(100 * (progressLength / cBoundaries.width))

        if (outsideContainer(cBoundaries, p)) {
            setPointerDown(false)
            if (onProgressChanged)
                onProgressChanged(100 * (progressLength / cBoundaries.width))
            return
        }
    }

    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
        if (!pointerDown)
            return

        setPointerDown(false)

        if (!containerRef.current || !sliderRef.current)
            return

        const p = getPointFromEvent(e)
        const cBoundaries = containerRef.current.getBoundingClientRect()
        const sBoundaries = sliderRef.current.getBoundingClientRect()

        const progressLength = Math.min(Math.max(cBoundaries.left, p.x), cBoundaries.right) - cBoundaries.left
        const left = progressLength - (sBoundaries.width / 2)

        sliderRef.current.style.left = `${left}px`

        if (onProgressChanged)
            onProgressChanged(100 * (progressLength / cBoundaries.width))
    }

    const outsideContainer = (r: DOMRect, p: Point) => p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom;

    const getPointFromEvent = (e) => ({ x: e.clientX, y: e.clientY })

    useEffect(() => {
        if (sliderRef.current && containerRef.current && (defaultProgress ?? 0) <= 100) {
            const cBoundaries = containerRef.current.getBoundingClientRect()
            const sBoundaries = sliderRef.current.getBoundingClientRect()

            if (!sliderRef.current.style.top || sliderRef.current.style.top === '0px')
                sliderRef.current.style.top = `${(cBoundaries.height - sBoundaries.height) / 2}px`

            sliderRef.current.style.left = `${(cBoundaries.width * ((defaultProgress ?? 0) / 100)) - (sBoundaries.width / 2)}px`
        }
    }, [sliderRef.current, containerRef.current])

    return (
        <div id="progressContainer" ref={containerRef} {...containerProps} className={cn(["w-full relative"], containerProps?.className)} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            {children}
            <div id="thumb" ref={sliderRef} {...sliderProps} className={cn(["size-[5mm] border rounded-full absolute top-0 left-0 bg-surface"], sliderProps?.className)} />
        </div>
    )
}
