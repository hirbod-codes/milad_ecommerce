import { cn } from "@/src/shadcn/lib/utils";
import { Select } from "../Select";
import { Input } from "../Input";
import { ComponentProps } from "react";

export function InputGroup({ fields = [], inputBorderRadius = 'md', containerProps }: { fields?: ({ type: 'input', props?: React.ComponentProps<typeof Input> } | { type: 'select', props: React.ComponentProps<typeof Select> })[], inputBorderRadius?: 'sm' | 'md' | 'lg' | 'none' | 'xl' | '2xl' | '3xl' | 'full', containerProps?: ComponentProps<'div'> }) {
    // rounded-sm rounded-md rounded-lg rounded-none rounded-xl rounded-2xl rounded-3xl rounded-full
    // rounded-l-sm rounded-l-md rounded-l-lg rounded-l-none rounded-l-xl rounded-l-2xl rounded-l-3xl rounded-l-full
    // rounded-r-sm rounded-r-md rounded-r-lg rounded-r-none rounded-r-xl rounded-r-2xl rounded-r-3xl rounded-r-full
    return (
        <div {...containerProps} className={cn(`flex flex-row border border-accent rounded-${inputBorderRadius}`, containerProps?.className)}>
            {
                fields.map(((f, i) => {
                    let roundness = 'rounded-none';
                    if (i === 0)
                        roundness += ` rounded-l-${inputBorderRadius}`
                    else if (i === (fields.length - 1))
                        roundness += ` rounded-r-${inputBorderRadius}`

                    let rightBorder = 'border-0'
                    if (fields.length > 1 && i !== (fields.length - 1))
                        rightBorder += ' border-r'

                    if (f.type === 'input')
                        return <Input
                            key={i}
                            {...f.props}
                            className={cn(`w-20 py-1 px-2 bg-surface text-surface-foreground ${rightBorder} border-accent ${roundness}`, f?.props?.className)}
                        />

                    if (f.type === 'select')
                        return <Select
                            key={i}
                            {...f.props}
                            inputProps={{
                                ...f.props?.inputProps,
                                className: cn(`w-20 py-1 px-2 bg-surface text-surface-foreground ${rightBorder} border- accent ${roundness}`, f?.props?.inputProps?.className),
                            }}
                        />
                }))
            }
        </div>
    )
}
