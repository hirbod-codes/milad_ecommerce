import { ComponentProps, ReactNode, RefObject, useEffect } from "react"
import { AnimatedSlide } from "../Animations/AnimatedSlide"
import { Button } from "./Button"
import { XIcon } from "lucide-react"
import { cn } from "../../shadcn/lib/utils"
import { Container } from "./Container"
import { createPortal } from "react-dom"
import { AnimatePresence, MotionProps, useAnimate, usePresence } from "framer-motion"

export type ModalProps = {
    children?: ReactNode
    open?: boolean
    onClose?: () => void
    animatedSlideProps?: ComponentProps<typeof AnimatedSlide>
    modalContainerProps?: ComponentProps<'div'> & MotionProps
    useResponsiveContainer?: boolean
    childrenContainerProps?: ComponentProps<'div'>
    childrenContainerRef?: RefObject<HTMLDivElement>
    closeButton?: boolean
    closeIcon?: ReactNode
    containerProps?: ComponentProps<'div'>
}

export function Modal({ open = false, ...props }: ModalProps) {
    return (
        <AnimatePresence>
            {open && <ModalCore {...props} />}
        </AnimatePresence>
    )
}

export function ModalCore({ children, onClose, useResponsiveContainer = true, modalContainerProps, childrenContainerProps, childrenContainerRef, closeButton = true, closeIcon, containerProps }: ModalProps) {
    const [containerRef, animateContainer] = useAnimate()
    const [backdropRef, animateBackdrop] = useAnimate()

    const [isPresent, safeToRemove] = usePresence()

    let i = 0
    for (const child of document.body.children) {
        if (child.id !== 'modal')
            continue
        else
            i++
    }

    closeIcon = closeIcon ?? <XIcon className="text-error" />

    useEffect(() => {
        if (isPresent) {
            const enterAnimation = async () => {
                await animateBackdrop(backdropRef.current, { opacity: 0.7 })
                animateContainer(containerRef.current, { x: window.screen.width })
            }
            enterAnimation()

        } else {
            const exitAnimation = async () => {
                animateContainer(containerRef.current, { x: window.screen.width * 2 })
                await animateBackdrop(backdropRef.current, { opacity: 0 })
                safeToRemove()
            }

            exitAnimation()
        }
    }, [isPresent])

    return createPortal(
        <div {...containerProps} className={cn("absolute bottom-0 left-0 h-screen w-screen flex flex-col justify-center items-center", containerProps?.className)} style={{ zIndex: i + 20, ...containerProps?.style }}>
            <div
                ref={backdropRef}
                id='modalScreen'
                className="h-screen w-screen overflow-hidden absolute top-0 left-0 bg-[black] opacity-0"
                onClick={() => { if (onClose) onClose() }}
                style={{ zIndex: 21 + i }}
            />

            <Container
                {...modalContainerProps}
                responsive={useResponsiveContainer}
                containerRef={containerRef}
                className={cn("relative max-h-[80%]", modalContainerProps?.className)}
                style={{
                    left: '-' + window.screen.width + 'px',
                    zIndex: 22 + i, ...modalContainerProps?.style
                }}
            >
                <div ref={childrenContainerRef} {...childrenContainerProps} className={cn("bg-surface-container overflow-auto rounded py-4 px-10 size-full", childrenContainerProps?.className)}>
                    {children}
                </div>

                {closeButton &&
                    <Button isIcon variant='text' fgColor='error' className="absolute right-0 top-0 m-2" onClick={() => { if (onClose) onClose() }}>
                        {closeIcon}
                    </Button>
                }
            </Container>
        </div >
        , document.body
    )
}
