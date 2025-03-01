import { cn } from "@/src/shadcn/lib/utils";
import { ComponentProps, CSSProperties, HTMLAttributes, memo, MouseEvent, ReactNode, RefObject, useContext } from "react";
import { ripple } from "../helpers";
import { ConfigurationContext } from "@/src/Contexts/Configuration/ConfigurationContext";
import { ColorStatic } from "@/src/Lib/Colors/ColorStatic";
import { motion, MotionProps } from 'framer-motion'

export type ButtonProps = {
    children?: ReactNode
    rippleEffect?: boolean
    variant?: 'outline' | 'contained' | 'text'
    rawFgColor?: string
    rawBgColor?: string
    fgColor?: 'primary' | 'secondary' | 'tertiary' | 'surface' | 'outline' | 'info' | 'success' | 'warning' | 'error' | string
    bgColor?: 'primary' | 'secondary' | 'tertiary' | 'surface' | 'outline' | 'info' | 'success' | 'warning' | 'error' | string
    size?: 'xl' | 'lg' | 'md' | 'sm' | 'xs'
    isIcon?: boolean
    buttonRef?: RefObject<HTMLButtonElement>
    layout?: boolean | "position" | "size" | "preserve-aspect"
} & (MotionProps & ComponentProps<'button'>)

export const Button = memo(function Button({ children, rippleEffect = true, variant = 'contained', rawBgColor, rawFgColor, bgColor = 'primary-container', fgColor = 'primary', size = 'md', isIcon = false, buttonRef, layout, ...buttonProps }: ButtonProps) {
    const themeOptions = useContext(ConfigurationContext)!.themeOptions

    let style: CSSProperties = {}
    let className: HTMLAttributes<HTMLButtonElement>['className'] = 'select-none overflow-hidden relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'
    switch (variant) {
        case 'contained':
            className += ` border-0`
            style.color = rawFgColor ?? `hsl(var(--${fgColor}))`
            style.backgroundColor = rawBgColor ?? `hsl(var(--${bgColor}))`
            break;

        case 'outline':
            className += ` border bg-transparent`
            style.color = rawFgColor ?? `hsl(var(--${fgColor}))`
            style.borderColor = rawFgColor ?? `hsl(var(--${fgColor}))`
            break;

        case 'text':
            className += ` border-0 bg-transparent`
            style.color = rawFgColor ?? `hsl(var(--${fgColor}))`
            style.borderColor = rawFgColor ?? `hsl(var(--${fgColor}))`
            break;

        default:
            break;
    }

    switch (size) {
        case 'xl':
            className += ` h-16 ${isIcon ? 'w-16' : ''} ${isIcon ? 'rounded-[50%]' : 'rounded-lg'} py-6 px-8 text-xl`
            break;
        case 'lg':
            className += ` h-14 ${isIcon ? 'w-14' : ''} ${isIcon ? 'rounded-[50%]' : 'rounded-lg'} py-4 px-6 text-lg`
            break;
        case 'md':
            className += ` h-11 ${isIcon ? 'w-11' : ''} ${isIcon ? 'rounded-[50%]' : 'rounded-md'} py-2 px-4 text-md`
            break;
        case 'sm':
            className += ` h-8 ${isIcon ? 'w-8' : ''} ${isIcon ? 'rounded-[50%]' : 'rounded-sm'} py-1.5 px-4 text-xs`
            break;
        case 'xs':
            className += ` h-7 ${isIcon ? 'w-7' : ''} ${isIcon ? 'rounded-[50%]' : 'rounded-sm'} py-0.5 px-2 text-xs`
            break;

        default:
            break;
    }

    className = cn(className, buttonProps?.className)
    style = { ...style, ...buttonProps?.style }

    return (
        <motion.button
            layout={layout}
            initial={false}
            {...buttonProps}
            ref={buttonRef}
            className={className}
            style={style}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
                if (rippleEffect)
                    ripple(e, ColorStatic.parse(themeOptions.colors.surface[themeOptions.mode].foreground).toHex())
                if (buttonProps?.onClick)
                    buttonProps.onClick(e)
            }}
        >
            <div className="absolute size-full top-0 left-0 bg-white opacity-0 transition-opacity duration-50 hover:opacity-10" style={{ borderRadius: 'inherit' }} />
            {children}
        </motion.button>
    )
})

