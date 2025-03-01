import { cn } from "@/src/shadcn/lib/utils";
import { ComponentProps, ReactNode } from "react";
import { Tooltip } from "../Tooltip";
import { TooltipTrigger } from "@/src/shadcn/components/ui/tooltip";

export function Text({ children, tooltipTriggerProps }: { children?: ReactNode, tooltipTriggerProps?: ComponentProps<typeof TooltipTrigger> }) {
    return (
        <Tooltip tooltipContent={children} triggerProps={{ ...tooltipTriggerProps, className: cn(['text-nowrap text-ellipsis overflow-hidden max-w-full'], tooltipTriggerProps?.className) }}>
            {children}
        </Tooltip>
    )
}
