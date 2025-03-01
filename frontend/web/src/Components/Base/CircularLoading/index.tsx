import { ComponentProps } from "react";
import { CircularLoadingIcon } from "../CircularLoadingIcon";
import { cn } from "@/src/shadcn/lib/utils";

export function CircularLoading({ size = 'md', containerProps }: { size?: 'xl' | 'lg' | 'md' | 'sm' | 'xs', containerProps?: ComponentProps<'div'> }) {
    let className = ''
    switch (size) {
        case 'xl':
            className += `size-16`
            break;
        case 'lg':
            className += `size-14`
            break;
        case 'md':
            className += `size-11`
            break;
        case 'sm':
            className += `size-8`
            break;
        case 'xs':
            className += `size-6`
            break;

        default:
            break;
    }

    return (
        <div {...containerProps} className={cn(className, containerProps?.className)}>
            <CircularLoadingIcon />
        </div>
    )
}

