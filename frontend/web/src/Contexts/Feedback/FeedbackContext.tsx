import { ComponentProps, createContext, ReactNode } from "react";
import { MotionProps } from 'framer-motion'
import { Button } from "@/src/Components/Base/Button";

export type Feedback = {
    node?: ReactNode
    color?: {
        rawFgColor?: string
        rawBgColor?: string
        fgColor?: 'primary' | 'secondary' | 'tertiary' | 'surface' | 'outline' | 'info' | 'success' | 'warning' | 'error' | string
        bgColor?: 'primary' | 'secondary' | 'tertiary' | 'surface' | 'outline' | 'info' | 'success' | 'warning' | 'error' | string
    }
    closeButton?: boolean
    props?: ComponentProps<'div'> & MotionProps
    closeButtonProps?: ComponentProps<typeof Button>
    createdAt?: number
    timeout?: number
}

export const FeedbackContext = createContext<{ push: (feedback: Feedback) => void } | undefined>(undefined)
