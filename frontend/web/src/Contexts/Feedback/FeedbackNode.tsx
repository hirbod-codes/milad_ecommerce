import { ComponentProps, CSSProperties, ReactNode } from "react";
import { motion, MotionProps } from 'framer-motion'
import { Button } from "@/src/Components/Base/Button";
import { XIcon } from "lucide-react";
import { cn } from "@/src/shadcn/lib/utils";

export type FeedbackProps = {
    id: number | string
    children?: ReactNode
    rawFgColor?: string
    rawBgColor?: string
    fgColor?: 'primary' | 'secondary' | 'tertiary' | 'surface' | 'outline' | 'info' | 'success' | 'warning' | 'error' | string
    bgColor?: 'primary' | 'secondary' | 'tertiary' | 'surface' | 'outline' | 'info' | 'success' | 'warning' | 'error' | string
    onClose?: () => void
    closeButton?: boolean
    closeButtonProps?: ComponentProps<typeof Button>
    props?: ComponentProps<'div'> & MotionProps
}

export function FeedbackNode({ id, children, rawFgColor, rawBgColor, fgColor, bgColor, onClose, closeButton, closeButtonProps, props }: FeedbackProps) {
    let style: CSSProperties = {}
    style.color = rawFgColor ?? `hsl(var(--${fgColor ?? 'primary-container-foreground'}))`
    style.backgroundColor = rawBgColor ?? `hsl(var(--${bgColor ?? 'primary-container'}))`

    return (
        <motion.div
            key={id}
            layout
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: 1, x: '0%' }}
            exit={{ opacity: 0, x: '-100%' }}
            {...props}
            className={cn("flex flex-row justify-between items-center rounded-lg shadow-xl my-2 p-2", ...props?.className ?? '')}
            style={{ ...style, ...props?.style }}
        >
            {children}
            {closeButton !== false && <Button variant='text' fgColor='error-container-foreground' isIcon size='xs' {...closeButtonProps} onClick={(e) => { if (onClose) onClose(); if (closeButtonProps?.onClick) closeButtonProps.onClick(e) }}><XIcon /></Button>}
        </motion.div>
    )
}
