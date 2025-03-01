import { ComponentProps, ReactNode, RefObject, useEffect } from "react"
import { AnimatedSlide } from "@/src/Components/Animations/AnimatedSlide"

export type DrawerProps = {
    children?: ReactNode
    containerRef?: RefObject<HTMLDivElement>
    animatedSlideProps?: Omit<ComponentProps<typeof AnimatedSlide>, 'children'>
    onClose?: () => void | Promise<void>
}

export function Drawer({ containerRef, children, animatedSlideProps, onClose }: DrawerProps) {
    useEffect(() => {
        function handleClickOutside(e) {
            if (!containerRef || !containerRef?.current || !onClose)
                return

            const d = containerRef.current.getBoundingClientRect()

            if (e.clientX < d.left || e.clientX > d.right || e.clientY < d.top || e.clientY > d.bottom)
                onClose()
        }

        document.body.addEventListener("pointerdown", handleClickOutside);

        return () => {
            document.body.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [containerRef, containerRef?.current]);

    return (
        <AnimatedSlide
            {...animatedSlideProps}
            inSource={animatedSlideProps?.inSource ?? 'left'}
            outSource={animatedSlideProps?.outSource ?? 'left'}
        >
            {children}
        </AnimatedSlide>
    )
}

