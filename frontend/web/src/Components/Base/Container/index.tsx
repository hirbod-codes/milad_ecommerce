import { ComponentProps, ReactNode, RefObject } from 'react'
import { cn } from '@/src/shadcn/lib/utils'

export function Container({ children, containerRef, layout = false, responsive = true, ...props }: { children?: ReactNode, containerRef?: RefObject<HTMLDivElement>, layout?: boolean | "position" | "size" | "preserve-aspect" | undefined, responsive?: boolean } & ComponentProps<'div'>) {
    return (
        <div ref={containerRef} {...props} className={cn(responsive ? 'lg:w-6/12 md:w-8/12 sm:w-10/12 w-11/12' : '', props?.className)}>
            {children}
        </div>
    )
}
