import { ComponentProps, memo, ReactNode, RefObject, useEffect, useReducer, useRef } from "react";
import { cn } from "@/src/shadcn/lib/utils";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, MotionProps } from "framer-motion";

export type DropdownMenuProps = {
    children: ReactNode
    anchorRef?: RefObject<HTMLElement | null>
    anchorDomRect?: { left?: number, top?: number, width?: number, height?: number }
    open?: boolean
    onOpenChange?: (open: boolean) => void
    containerProps?: ComponentProps<'div'> & MotionProps
    verticalPosition?: 'top' | 'center' | 'bottom'
    horizontalPosition?: 'left' | 'center' | 'right'
}

export const DropdownMenu = memo(function DropdownMenu({ children, anchorRef, anchorDomRect, open = false, onOpenChange, containerProps, verticalPosition = 'bottom', horizontalPosition = 'center' }: DropdownMenuProps) {
    const [, rerender] = useReducer(x => x + 1, 0)

    const containerRef = useRef<HTMLDivElement>(null)
    const helperRef = useRef<HTMLDivElement>(null)

    const updatePosition = () => {
        if (!containerRef?.current)
            return

        if (!anchorDomRect && !anchorRef?.current)
            return

        if (anchorDomRect && (!anchorDomRect.left || !anchorDomRect.top || !anchorDomRect.width || !anchorDomRect.height))
            return

        let aRect: any = anchorDomRect ?? anchorRef?.current!.getBoundingClientRect()
        const cRect = {
            ...containerRef.current.getBoundingClientRect(),
            width: helperRef?.current?.getBoundingClientRect().width,
            height: helperRef?.current?.getBoundingClientRect().height,
        }
        console.log({ aRect, cRect })

        // console.log('updatePosition', verticalPosition, horizontalPosition, { visualViewport: window.visualViewport, 'ref': anchorRef?.current, 'scrollTop': anchorRef?.current?.scrollTop, 'offsetTop': anchorRef?.current?.offsetTop, 'offsetLeft': anchorRef?.current?.offsetLeft, 'offsetHeight': anchorRef?.current?.offsetHeight, 'offsetWidth': anchorRef?.current?.offsetWidth, 'aRect.top': aRect?.top, 'aRect.bottom': aRect?.bottom, 'aRect.left': aRect?.left, 'aRect.right': aRect?.right, 'aRect.width': aRect?.width, 'aRect.height': aRect?.height })
        // console.log('updatePosition', verticalPosition, horizontalPosition, { 'ref': containerRef.current, 'offsetTop': containerRef.current.offsetTop, 'offsetLeft': containerRef.current.offsetLeft, 'offsetHeight': containerRef.current.offsetHeight, 'offsetWidth': containerRef.current.offsetWidth, 'cRect.top': cRect.top, 'cRect.bottom': cRect.bottom, 'cRect.left': cRect.left, 'cRect.right': cRect.right, 'cRect.width': cRect.width, 'cRect.height': cRect.height })

        containerRef.current.style.top = ''
        containerRef.current.style.bottom = ''
        containerRef.current.style.left = ''
        containerRef.current.style.right = ''

        // aRect = { left: aRect.right, right: aRect.left, top: aRect.top, bottom: aRect.bottom, width: aRect.width, height: aRect.height }

        positionElement(containerRef.current, verticalPosition, horizontalPosition, aRect! as DOMRect, cRect, window.innerHeight, window.innerWidth)

        // containerRef.current.style.right = containerRef.current.style.left
        // containerRef.current.style.left = ''
    }

    useEffect(() => {
        if (containerRef?.current && open) {
            updatePosition()
            rerender()
        }

        if (onOpenChange)
            onOpenChange(open)
    }, [open])

    useEffect(() => {
        updatePosition()
        window.addEventListener('resize', updatePosition)
        return () => window.removeEventListener('resize', updatePosition)
    }, [])

    useEffect(() => {
        function handleClickOutside(e: PointerEvent) {
            e.preventDefault()
            e.stopPropagation()

            if (!containerRef || !containerRef?.current || !onOpenChange || !anchorRef || !anchorRef?.current)
                return

            const c = containerRef.current.getBoundingClientRect()
            const a = anchorRef.current.getBoundingClientRect()

            const outOfContainer = e.clientX < c.left || e.clientX > c.right || e.clientY < c.top || e.clientY > c.bottom
            const outOfAnchor = e.clientX < a.left || e.clientX > a.right || e.clientY < a.top || e.clientY > a.bottom

            if (outOfAnchor && outOfContainer)
                onOpenChange(false)
        }

        document.body.addEventListener("pointerdown", handleClickOutside);

        return () => { document.body.removeEventListener("pointerdown", handleClickOutside) }
    }, [containerRef, containerRef?.current]);

    // console.log('DropdownMenu', { anchorDomRect, containerRef: containerRef, anchorRef, onOpenChange, containerProps, verticalPosition, horizontalPosition })

    return createPortal(
        <>
            {open && <div ref={helperRef} className="absolute top-0 left-0 invisible -z-[60]">{children}</div>}
            <AnimatePresence>
                {open &&
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        {...containerProps}
                        id="dropdown-container"
                        ref={containerRef}
                        className={cn(['absolute z-50'], containerProps?.className)}
                    >
                        {children}
                    </motion.div>
                }
            </AnimatePresence>
        </>
        , document.body
    )
})

function positionElement(element: HTMLElement | undefined, verticalPosition: 'top' | 'center' | 'bottom', horizontalPosition: 'left' | 'center' | 'right', anchor: DOMRect, container: DOMRect, screenHeight: number, screenWidth: number, shouldOverlap = false): { left?: string, right?: string, top?: string, bottom?: string } {
    let domRect: { left: string, right: string, top: string, bottom: string } = {
        left: 'auto',
        right: 'auto',
        top: 'auto',
        bottom: 'auto',
    }

    switch (verticalPosition) {
        case 'top':
            if (!isTopNegative(anchor, container))
                domRect.top = putTop(element, anchor, container)
            else if (shouldOverlap)
                domRect.top = putAbsoluteTop(element)
            else if (horizontalPosition === 'center')
                if (!isBottomNegative(anchor, container, screenHeight))
                    domRect.top = putBottom(element, anchor)
                else
                    domRect.top = putAbsoluteTop(element)
            else
                domRect.top = putAbsoluteTop(element)
            break;

        case 'center':
            if (shouldOverlap)
                domRect.top = putCenterVertically(element, anchor, container)
            else if (horizontalPosition === 'center')
                throw new Error('horizontalPosition and verticalPosition must not be set to center, when shouldOverlap is set to true.')
            else if (isLeftNegative(anchor, container) && isRightNegative(anchor, container, screenWidth))
                if (!isTopNegative(anchor, container))
                    domRect.top = putTop(element, anchor, container)
                else if (!isBottomNegative(anchor, container, screenHeight))
                    domRect.top = putBottom(element, anchor)
                else
                    domRect.top = putAbsoluteTop(element)
            else if (!isVerticalCenterNegative(anchor, container, screenHeight))
                domRect.top = putCenterVertically(element, anchor, container)
            else if (isVerticalCenterTopNegative(anchor, container))
                domRect.top = putAbsoluteTop(element)
            else if (isVerticalCenterBottomNegative(anchor, container, screenHeight))
                domRect.bottom = putAbsoluteBottom(element)
            else
                domRect.top = putAbsoluteTop(element)
            break;

        case 'bottom':
            if (!isBottomNegative(anchor, container, screenHeight))
                domRect.top = putBottom(element, anchor)
            else if (shouldOverlap)
                domRect.bottom = putAbsoluteBottom(element)
            else if (horizontalPosition === 'center')
                if (!isTopNegative(anchor, container))
                    domRect.top = putTop(element, anchor, container)
                else
                    domRect.bottom = putAbsoluteBottom(element)
            else
                domRect.bottom = putAbsoluteBottom(element)
            break;

        default:
            throw new Error('Unsupported value for verticalPosition provided, supported values are: top, center, bottom')
    }

    switch (horizontalPosition) {
        case 'left':
            if (!isLeftNegative(anchor, container))
                domRect.left = putLeft(element, anchor, container)
            else if (shouldOverlap)
                domRect.left = putAbsoluteLeft(element)
            else if (verticalPosition === 'center')
                if (!isRightNegative(anchor, container, screenWidth))
                    domRect.left = putRight(element, anchor)
                else
                    domRect.left = putAbsoluteLeft(element)
            else
                domRect.left = putAbsoluteLeft(element)
            break;

        case 'center':
            if (shouldOverlap)
                domRect.left = putCenterHorizontally(element, anchor, container)
            else if (verticalPosition === 'center')
                throw new Error('horizontalPosition and verticalPosition must not be set to center, when shouldOverlap is set to true.')
            else if (isTopNegative(anchor, container) && isBottomNegative(anchor, container, screenWidth))
                if (!isLeftNegative(anchor, container))
                    domRect.left = putLeft(element, anchor, container)
                else if (!isRightNegative(anchor, container, screenHeight))
                    domRect.left = putRight(element, anchor)
                else
                    domRect.left = putAbsoluteLeft(element)
            else if (!isHorizontalCenterNegative(anchor, container, screenWidth))
                domRect.left = putCenterHorizontally(element, anchor, container)
            else if (isHorizontalCenterLeftNegative(anchor, container))
                domRect.left = putAbsoluteLeft(element)
            else if (isHorizontalCenterRightNegative(anchor, container, screenWidth))
                domRect.right = putAbsoluteRight(element)
            else
                domRect.left = putAbsoluteLeft(element)
            break;

        case 'right':
            if (!isRightNegative(anchor, container, screenWidth))
                domRect.left = putRight(element, anchor)
            else if (shouldOverlap)
                domRect.right = putAbsoluteRight(element)
            else if (verticalPosition === 'center')
                if (!isLeftNegative(anchor, container))
                    domRect.left = putLeft(element, anchor, container)
                else
                    domRect.right = putAbsoluteRight(element)
            else
                domRect.right = putAbsoluteRight(element)
            break;

        default:
            throw new Error('Unsupported value for horizontalPosition provided, supported values are: left, center, right')
    }

    return domRect
}

function isTopNegative(anchor: DOMRect, container: DOMRect): boolean {
    return anchor.top - container.height < 0
}

function isLeftNegative(anchor: DOMRect, container: DOMRect): boolean {
    return anchor.left - container.width < 0
}

function isBottomNegative(anchor: DOMRect, container: DOMRect, screenHeight: number): boolean {
    return anchor.top + anchor.height + container.height > screenHeight
}

function isRightNegative(anchor: DOMRect, container: DOMRect, screenWidth: number): boolean {
    return anchor.left + anchor.width + container.width > screenWidth
}

function isVerticalCenterNegative(anchor: DOMRect, container: DOMRect, screenHeight: number): boolean {
    return isVerticalCenterTopNegative(anchor, container) || isVerticalCenterBottomNegative(anchor, container, screenHeight)
}

function isVerticalCenterTopNegative(anchor: DOMRect, container: DOMRect): boolean {
    return anchor.top + (anchor.height / 2) - (container.height / 2) < 0
}

function isVerticalCenterBottomNegative(anchor: DOMRect, container: DOMRect, screenHeight: number): boolean {
    return (anchor.top + (anchor.height / 2) - (container.height / 2) + container.height) > screenHeight
}

function isHorizontalCenterNegative(anchor: DOMRect, container: DOMRect, screenWidth: number): boolean {
    return isHorizontalCenterLeftNegative(anchor, container) || isHorizontalCenterRightNegative(anchor, container, screenWidth)
}

function isHorizontalCenterRightNegative(anchor: DOMRect, container: DOMRect, screenWidth: number): boolean {
    return (anchor.left + (anchor.width / 2) + (container.width / 2)) > screenWidth
}

function isHorizontalCenterLeftNegative(anchor: DOMRect, container: DOMRect): boolean {
    return (anchor.left + (anchor.width / 2) - (container.width / 2)) < 0
}

function putAbsoluteTop(containerElement: HTMLElement | undefined, margin = 0): string {
    if (containerElement)
        containerElement.style.top = `${margin.toFixed(0)}px`
    return `${margin.toFixed(0)}px`
}

function putAbsoluteRight(containerElement: HTMLElement | undefined, margin = 0): string {
    if (containerElement)
        containerElement.style.right = `${margin.toFixed(0)}px`
    return `${margin.toFixed(0)}px`
}

function putAbsoluteBottom(containerElement: HTMLElement | undefined, margin = 0): string {
    if (containerElement)
        containerElement.style.bottom = `${margin.toFixed(0)}px`
    return `${margin.toFixed(0)}px`
}

function putAbsoluteLeft(containerElement: HTMLElement | undefined, margin = 0): string {
    if (containerElement)
        containerElement.style.left = `${margin.toFixed(0)}px`
    return `${margin.toFixed(0)}px`
}

function putTop(containerElement: HTMLElement | undefined, anchor: DOMRect, container: DOMRect): string {
    if (containerElement)
        containerElement.style.top = `${anchor.top - container.height}px`
    return `${anchor.top - container.height}px`
}

function putRight(containerElement: HTMLElement | undefined, anchor: DOMRect): string {
    if (containerElement)
        containerElement.style.left = `${anchor.left + anchor.width}px`
    return `${anchor.left + anchor.width}px`
}

function putBottom(containerElement: HTMLElement | undefined, anchor: DOMRect): string {
    if (containerElement)
        containerElement.style.top = `${anchor.top + anchor.height}px`
    return `${anchor.top + anchor.height}px`
}

function putLeft(containerElement: HTMLElement | undefined, anchor: DOMRect, container: DOMRect): string {
    if (containerElement)
        containerElement.style.left = `${anchor.left - container.width}px`
    return `${anchor.left - container.width}px`
}

function putCenterHorizontally(containerElement: HTMLElement | undefined, anchor: DOMRect, container: DOMRect): string {
    if (containerElement)
        containerElement.style.left = `${anchor.left + (anchor.width / 2) - (container.width / 2)}px`
    return `${anchor.left + (anchor.width / 2) - (container.width / 2)}px`
}

function putCenterVertically(containerElement: HTMLElement | undefined, anchor: DOMRect, container: DOMRect): string {
    if (containerElement)
        containerElement.style.top = `${anchor.top + (anchor.height / 2) - (container.height / 2)}px`
    return `${anchor.top + (anchor.height / 2) - (container.height / 2)}px`
}
