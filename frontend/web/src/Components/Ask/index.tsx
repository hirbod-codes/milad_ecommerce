import { ReactNode } from "react";
import { Modal } from "../Base/Modal";
import { Stack } from "../Base/Stack";
import { Separator } from "@/src/shadcn/components/ui/separator";
import { Button } from "../Base/Button";
import { t } from "i18next";

export function Ask({ open, onClose, title, content, successAction, failureAction, successLabel, failureLabel }: { open: boolean, onClose?: () => void, title?: ReactNode, content?: ReactNode, successAction?: () => Promise<void> | void, failureAction?: () => Promise<void> | void, successLabel?: string, failureLabel?: string }) {
    return (
        <Modal open={open} onClose={onClose}>
            <Stack direction="vertical">
                {title &&
                    <>
                        <div className="text-2xl">{title}</div>
                        <Separator />
                    </>
                }
                {content}
                <Stack stackProps={{ className: 'mt-1 w-full' }}>
                    <Button className="flex-grow" onClick={async () => { if (successAction) await successAction() }} >{successLabel ?? t('common.ok')}</Button>
                    <Button className="flex-grow" fgColor="error" onClick={async () => { if (failureAction) await failureAction() }} >{failureLabel ?? t('common.cancel')}</Button>
                </Stack>
            </Stack>
        </Modal>
    )
}

