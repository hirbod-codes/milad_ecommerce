import { ComponentProps, ReactNode } from "react"
import {
    Tooltip as ShadcnToolTip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/src/shadcn/components/ui/tooltip"

export function Tooltip({ children, triggerProps, tooltipContent, contentProps, delayDuration = 500, skipDelayDuration }: { children: ReactNode, triggerProps?: ComponentProps<typeof TooltipTrigger>, contentProps?: ComponentProps<typeof TooltipContent>, tooltipContent: ReactNode, delayDuration?: number, skipDelayDuration?: number }) {
    return (
        <TooltipProvider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
            <ShadcnToolTip>
                <TooltipTrigger {...triggerProps}>{children}</TooltipTrigger>
                <TooltipContent {...contentProps}>{tooltipContent}</TooltipContent>
            </ShadcnToolTip>
        </TooltipProvider>
    )
}
