import { Label } from "@/src/shadcn/components/ui/label";
import { Switch as ShadcnSwitch } from "@/src/shadcn/components/ui/switch";
import { ComponentProps } from "react";

export function Switch({ labelId, label, ...props }: { labelId?: string, label?: string, } & ComponentProps<typeof ShadcnSwitch>) {
    const switchInput = <ShadcnSwitch id={labelId} {...props} />

    if (label && labelId)
        return (
            <div className="flex items-center space-x-2">
                {switchInput}
                <Label htmlFor={labelId}>{label}</Label>
            </div>
        )
    else
        return switchInput
}

