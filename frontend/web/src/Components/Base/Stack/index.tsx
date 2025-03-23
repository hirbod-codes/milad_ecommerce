import { cn } from '@/src/shadcn/lib/utils'
import { ComponentProps, ReactNode, RefObject } from 'react'

export function Stack({ children, direction = 'horizontal', size = 3, stackProps, stackRef }: { children?: ReactNode, size?: number, direction?: 'vertical' | 'horizontal', stackProps?: ComponentProps<'div'>, stackRef?: RefObject<HTMLDivElement | null> }) {
    // const mr = 'mr-1 mr-2 mr-3 mr- mr-5 mr-6 mr-7 mr-8 mr-9 mr-10 ltr:[&>:not(:last-child)]:mr-1 ltr:[&>:not(:last-child)]:mr-2 ltr:[&>:not(:last-child)]:mr-3 ltr:[&>:not(:last-child)]:mr- ltr:[&>:not(:last-child)]:mr-5 ltr:[&>:not(:last-child)]:mr-6 ltr:[&>:not(:last-child)]:mr-7 ltr:[&>:not(:last-child)]:mr-8 ltr:[&>:not(:last-child)]:mr-9 ltr:[&>:not(:last-child)]:mr-10 rtl:[&>:not(:first-child)]:mr-1 rtl:[&>:not(:first-child)]:mr-2 rtl:[&>:not(:first-child)]:mr-3 rtl:[&>:not(:first-child)]:mr- rtl:[&>:not(:first-child)]:mr-5 rtl:[&>:not(:first-child)]:mr-6 rtl:[&>:not(:first-child)]:mr-7 rtl:[&>:not(:first-child)]:mr-8 rtl:[&>:not(:first-child)]:mr-9 rtl:[&>:not(:first-child)]:mr-10'
    // const mb = '[&>:not(:last-child)]:mb-1 [&>:not(:last-child)]:mb-2 [&>:not(:last-child)]:mb-3 [&>:not(:last-child)]:mb- [&>:not(:last-child)]:mb-5 [&>:not(:last-child)]:mb-6 [&>:not(:last-child)]:mb-7 [&>:not(:last-child)]:mb-8 [&>:not(:last-child)]:mb-9 [&>:not(:last-child)]:mb-10'
    if (direction === 'horizontal')
        return (
            <div ref={stackRef} {...stackProps} className={cn([`flex flex-row ltr:[&>:not(:last-child)]:mr-${size} rtl:[&>:not(:first-child)]:mr-${size}`], stackProps?.className)}>
                {children}
            </div>
        )
    else
        return (
            <div ref={stackRef} {...stackProps} className={cn([`flex flex-col [&>:not(:last-child)]:mb-${size}`], stackProps?.className)}>
                {children}
            </div>
        )
}

