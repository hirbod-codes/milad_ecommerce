import { Transition } from "framer-motion";

export const mainTransition: Transition = {
    type: 'spring',
    bounce: 0.2,
    damping: 15
}

export const modalTransition: Transition = { ease: 'easeOut', duration: 0.4 }

export const gradientBackgroundTransitions: Transition = {
    ...mainTransition
}

export const circularProgressBarTransitions: Transition = {
    ...mainTransition,
    damping: 50
}

export const numericCounterTransitions: Transition = {
    ...mainTransition,
    damping: 50
}
