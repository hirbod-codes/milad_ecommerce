import { ComponentProps, memo, ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SlideMotion } from './SlideMotion';

export type AnimatedSlideProps = ComponentProps<typeof SlideMotion> & {
    children: ReactNode
    open?: boolean
    presenceMode?: 'sync' | 'wait' | 'popLayout' | undefined
}

export const AnimatedSlide = memo(function AnimatedSlide({ children, open = false, presenceMode = 'sync', ...props }: AnimatedSlideProps) {
    return (
        <AnimatePresence mode={presenceMode}>
            {open &&
                <SlideMotion {...props}>
                    {children}
                </SlideMotion>
            }
        </AnimatePresence>
    )
})
