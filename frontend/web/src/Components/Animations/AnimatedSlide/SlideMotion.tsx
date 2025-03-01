import { ComponentProps, ReactNode, useEffect } from 'react'
import { motion, MotionProps, Transition, Variants } from 'framer-motion'
import { variants as SlideVariants } from './variants'
import { getTransitions as slideGetTransitions } from './transitions'

export type SlideMotionProps = {
    children: ReactNode
    motionKey?: string | number
    motionDivProps?: MotionProps & ComponentProps<'div'>
    layout?: boolean | "position" | "size" | "preserve-aspect" | undefined
    delay?: number
    disappear?: boolean
    inSource?: 'left' | 'top' | 'bottom' | 'right'
    outSource?: 'left' | 'top' | 'bottom' | 'right'
    variants?: Variants
    transition?: Transition
}

export function SlideMotion({ children, motionKey, motionDivProps, delay = 0, inSource = 'left', outSource = 'right', disappear = true }: SlideMotionProps) {
    if (!motionDivProps)
        motionDivProps = {}

    motionDivProps.variants = motionDivProps?.variants ?? SlideVariants
    motionDivProps.transition = motionDivProps?.transition ?? slideGetTransitions(delay ?? 0)

    useEffect(() => {
        motionDivProps.transition = motionDivProps?.transition ?? slideGetTransitions(delay ?? 0)
    }, [delay])

    // console.log('SlideMotion', { children, motionKey, motionDivProps, inSource, outSource, disappear })

    return (
        <motion.div
            key={motionKey}
            initial='enter'
            animate='active'
            exit='exit'
            custom={{ inSource, outSource, disappear }}
            {...motionDivProps}
        >
            {children}
        </motion.div>
    )
}
