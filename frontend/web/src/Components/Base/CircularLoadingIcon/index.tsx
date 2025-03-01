import { cn } from "@/src/shadcn/lib/utils";
import { ComponentProps, CSSProperties } from "react";

import './index.css'

export function CircularLoadingIcon({ svgProps, styles }: { svgProps?: ComponentProps<'svg'>, styles?: CSSProperties }) {
    return (
        <svg
            viewBox="25 25 50 50"
            style={{
                transformOrigin: 'center',
                animation: 'rotate 2s linear infinite',
                ...styles
            }}
            {...svgProps}
            className={cn([""], svgProps?.className)}
        >
            <circle
                style={{ animation: 'dash 1.5s ease-in-out infinite' }}
                r="20"
                cy="50"
                cx="50"
                fill='none'
                stroke='hsl(214, 97%, 59%)'
                strokeWidth='2'
                strokeDasharray='1, 200'
                strokeDashoffset='0'
                strokeLinecap='round'
            ></circle>
        </svg >
    )
}

