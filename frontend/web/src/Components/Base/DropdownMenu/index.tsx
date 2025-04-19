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
        console.log(containerRef.current, anchorRef?.current, { aRect, cRect })

        // console.log('updatePosition', verticalPosition, horizontalPosition, { visualViewport: window.visualViewport, 'ref': anchorRef?.current, 'scrollTop': anchorRef?.current?.scrollTop, 'offsetTop': anchorRef?.current?.offsetTop, 'offsetLeft': anchorRef?.current?.offsetLeft, 'offsetHeight': anchorRef?.current?.offsetHeight, 'offsetWidth': anchorRef?.current?.offsetWidth, 'aRect.top': aRect?.top, 'aRect.bottom': aRect?.bottom, 'aRect.left': aRect?.left, 'aRect.right': aRect?.right, 'aRect.width': aRect?.width, 'aRect.height': aRect?.height })
        // console.log('updatePosition', verticalPosition, horizontalPosition, { 'ref': containerRef.current, 'offsetTop': containerRef.current.offsetTop, 'offsetLeft': containerRef.current.offsetLeft, 'offsetHeight': containerRef.current.offsetHeight, 'offsetWidth': containerRef.current.offsetWidth, 'cRect.top': cRect.top, 'cRect.bottom': cRect.bottom, 'cRect.left': cRect.left, 'cRect.right': cRect.right, 'cRect.width': cRect.width, 'cRect.height': cRect.height })

        containerRef.current.style.top = ''
        containerRef.current.style.bottom = ''
        containerRef.current.style.left = ''
        containerRef.current.style.right = ''

        // aRect = { left: aRect.right, right: aRect.left, top: aRect.top, bottom: aRect.bottom, width: aRect.width, height: aRect.height }

        console.log(positionElement(containerRef.current, verticalPosition, horizontalPosition, aRect! as DOMRect, cRect, window.innerHeight, window.innerWidth))

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

    const check = {
        isTopNegative: isTopNegative(anchor, container),
        isBottomNegative: isBottomNegative(anchor, container, screenHeight),
        isLeftNegative: isLeftNegative(anchor, container),
        isRightNegative: isRightNegative(anchor, container, screenWidth),
        isVerticalCenterNegative: isVerticalCenterNegative(anchor, container, screenHeight),
        isVerticalCenterTopNegative: isVerticalCenterTopNegative(anchor, container),
        isVerticalCenterBottomNegative: isVerticalCenterBottomNegative(anchor, container, screenHeight),
        isHorizontalCenterNegative: isHorizontalCenterNegative(anchor, container, screenWidth),
        isHorizontalCenterLeftNegative: isHorizontalCenterLeftNegative(anchor, container),
        isHorizontalCenterRightNegative: isHorizontalCenterRightNegative(anchor, container, screenWidth),
    }
    console.log(check)

    switch (verticalPosition) {
        case 'top':
            if (!check.isTopNegative)
                domRect.top = putTop(element, anchor, container)
            else if (shouldOverlap)
                domRect.top = putAbsoluteTop(element)
            else if (horizontalPosition === 'center')
                if (!check.isBottomNegative)
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
            else if (check.isLeftNegative && check.isRightNegative)
                if (!check.isTopNegative)
                    domRect.top = putTop(element, anchor, container)
                else if (!check.isBottomNegative)
                    domRect.top = putBottom(element, anchor)
                else
                    domRect.top = putAbsoluteTop(element)
            else if (!check.isVerticalCenterNegative)
                domRect.top = putCenterVertically(element, anchor, container)
            else if (check.isVerticalCenterTopNegative)
                domRect.top = putAbsoluteTop(element)
            else if (check.isVerticalCenterBottomNegative)
                domRect.bottom = putAbsoluteBottom(element)
            else
                domRect.top = putAbsoluteTop(element)
            break;

        case 'bottom':
            if (!check.isBottomNegative)
                domRect.top = putBottom(element, anchor)
            else if (shouldOverlap)
                domRect.bottom = putAbsoluteBottom(element)
            else if (horizontalPosition === 'center')
                if (!check.isTopNegative)
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
            if (!check.isLeftNegative)
                domRect.left = putLeft(element, anchor, container)
            else if (shouldOverlap)
                domRect.left = putAbsoluteLeft(element)
            else if (verticalPosition === 'center')
                if (!check.isRightNegative)
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
                throw new Error('horizontalPosition and verticalPosition must not be set to center, when shouldOverlap is set to false.')
            else if (check.isTopNegative && check.isBottomNegative)
                if (!check.isLeftNegative)
                    domRect.left = putLeft(element, anchor, container)
                else if (!check.isRightNegative)
                    domRect.left = putRight(element, anchor)
                else
                    domRect.left = putAbsoluteLeft(element)
            else if (!check.isHorizontalCenterNegative)
                domRect.left = putCenterHorizontally(element, anchor, container)
            else if (check.isHorizontalCenterLeftNegative)
                domRect.left = putAbsoluteLeft(element)
            else if (check.isHorizontalCenterRightNegative)
                domRect.right = putAbsoluteRight(element)
            else
                domRect.left = putAbsoluteLeft(element)
            break;

        case 'right':
            if (!check.isRightNegative)
                domRect.left = putRight(element, anchor)
            else if (shouldOverlap)
                domRect.right = putAbsoluteRight(element)
            else if (verticalPosition === 'center')
                if (!check.isLeftNegative)
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
    console.log('isTopNegative', anchor.top - container.height < 0)
    return anchor.top - container.height < 0
}

function isLeftNegative(anchor: DOMRect, container: DOMRect): boolean {
    console.log('isLeftNegative', anchor.left - container.width < 0)
    return anchor.left - container.width < 0
}

function isBottomNegative(anchor: DOMRect, container: DOMRect, screenHeight: number): boolean {
    console.log('isBottomNegative', anchor.top + anchor.height + container.height > screenHeight)
    return anchor.top + anchor.height + container.height > screenHeight
}

function isRightNegative(anchor: DOMRect, container: DOMRect, screenWidth: number): boolean {
    console.log('isRightNegative', anchor.left + anchor.width + container.width > screenWidth)
    return anchor.left + anchor.width + container.width > screenWidth
}

function isVerticalCenterNegative(anchor: DOMRect, container: DOMRect, screenHeight: number): boolean {
    console.log('isVerticalCenterNegative', isVerticalCenterTopNegative(anchor, container) || isVerticalCenterBottomNegative(anchor, container, screenHeight))
    return isVerticalCenterTopNegative(anchor, container) || isVerticalCenterBottomNegative(anchor, container, screenHeight)
}

function isVerticalCenterTopNegative(anchor: DOMRect, container: DOMRect): boolean {
    console.log('isVerticalCenterTopNegative', anchor.top + (anchor.height / 2) - (container.height / 2) < 0)
    return anchor.top + (anchor.height / 2) - (container.height / 2) < 0
}

function isVerticalCenterBottomNegative(anchor: DOMRect, container: DOMRect, screenHeight: number): boolean {
    console.log('isVerticalCenterBottomNegative', (anchor.top + (anchor.height / 2) - (container.height / 2) + container.height) > screenHeight)
    return (anchor.top + (anchor.height / 2) - (container.height / 2) + container.height) > screenHeight
}

function isHorizontalCenterNegative(anchor: DOMRect, container: DOMRect, screenWidth: number): boolean {
    console.log('isHorizontalCenterNegative', isHorizontalCenterLeftNegative(anchor, container) || isHorizontalCenterRightNegative(anchor, container, screenWidth))
    return isHorizontalCenterLeftNegative(anchor, container) || isHorizontalCenterRightNegative(anchor, container, screenWidth)
}

function isHorizontalCenterRightNegative(anchor: DOMRect, container: DOMRect, screenWidth: number): boolean {
    console.log('isHorizontalCenterRightNegative', (anchor.left + (anchor.width / 2) + (container.width / 2)) > screenWidth)
    return (anchor.left + (anchor.width / 2) + (container.width / 2)) > screenWidth
}

function isHorizontalCenterLeftNegative(anchor: DOMRect, container: DOMRect): boolean {
    console.log('isHorizontalCenterLeftNegative', (anchor.left + (anchor.width / 2) - (container.width / 2)) < 0)
    return (anchor.left + (anchor.width / 2) - (container.width / 2)) < 0
}

function putAbsoluteTop(containerElement: HTMLElement | undefined, margin = 0): string {
    console.log('putAbsoluteTop')
    if (containerElement)
        containerElement.style.top = `${margin.toFixed(0)}px`
    return `${margin.toFixed(0)}px`
}

function putAbsoluteRight(containerElement: HTMLElement | undefined, margin = 0): string {
    console.log('putAbsoluteRight')
    if (containerElement)
        containerElement.style.right = `${margin.toFixed(0)}px`
    return `${margin.toFixed(0)}px`
}

function putAbsoluteBottom(containerElement: HTMLElement | undefined, margin = 0): string {
    console.log('putAbsoluteBottom')
    if (containerElement)
        containerElement.style.bottom = `${margin.toFixed(0)}px`
    return `${margin.toFixed(0)}px`
}

function putAbsoluteLeft(containerElement: HTMLElement | undefined, margin = 0): string {
    console.log('putAbsoluteLeft')
    if (containerElement)
        containerElement.style.left = `${margin.toFixed(0)}px`
    return `${margin.toFixed(0)}px`
}

function putTop(containerElement: HTMLElement | undefined, anchor: DOMRect, container: DOMRect): string {
    console.log('putTop')
    if (containerElement)
        containerElement.style.top = `${anchor.top - container.height}px`
    return `${anchor.top - container.height}px`
}

function putRight(containerElement: HTMLElement | undefined, anchor: DOMRect): string {
    console.log('putRight')
    if (containerElement)
        containerElement.style.left = `${anchor.left + anchor.width}px`
    return `${anchor.left + anchor.width}px`
}

function putBottom(containerElement: HTMLElement | undefined, anchor: DOMRect): string {
    console.log('putBottom')
    if (containerElement)
        containerElement.style.top = `${anchor.top + anchor.height}px`
    return `${anchor.top + anchor.height}px`
}

function putLeft(containerElement: HTMLElement | undefined, anchor: DOMRect, container: DOMRect): string {
    console.log('putLeft')
    if (containerElement)
        containerElement.style.left = `${anchor.left - container.width}px`
    return `${anchor.left - container.width}px`
}

function putCenterHorizontally(containerElement: HTMLElement | undefined, anchor: DOMRect, container: DOMRect): string {
    console.log('putCenterHorizontally')
    if (containerElement)
        containerElement.style.left = `${anchor.left + (anchor.width / 2) - (container.width / 2)}px`
    return `${anchor.left + (anchor.width / 2) - (container.width / 2)}px`
}

function putCenterVertically(containerElement: HTMLElement | undefined, anchor: DOMRect, container: DOMRect): string {
    console.log('putCenterVertically')
    if (containerElement)
        containerElement.style.top = `${anchor.top + (anchor.height / 2) - (container.height / 2)}px`
    return `${anchor.top + (anchor.height / 2) - (container.height / 2)}px`
}
