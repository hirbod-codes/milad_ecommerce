import { ComponentProps, useState } from "react";
import { Button } from "../../Base/Button";
import { Stack } from "../../Base/Stack";
import { Modal } from "../../Base/Modal";
import { t } from "i18next";

import { Tabs } from "../../Base/Tabs";
import { SmsAuth } from "./SmsAuth";
import { EmailAuth } from "./EmailAuth";

export type LoginModalProps = {
    open: boolean
    onClose: () => void
    modalProps?: ComponentProps<typeof Modal>
}

export function AuthModal({ open, onClose, modalProps }: LoginModalProps) {
    const [tabIndex, setTabIndex] = useState<number>(0)

    return (
        <Modal
            closeButton={false}
            open={open}
            onClose={onClose}
            {...modalProps}
        >
            <Stack direction='vertical' stackProps={{ className: 'p-5' }}>
                <div className="text-3xl text-center">
                    {t('authModal.title')}
                </div>

                <Tabs
                    defaultTab={0}
                    tabs={[
                        { node: <Button variant="text" fgColor={tabIndex === 0 ? 'success' : 'surface-foreground'}>{t('common.sms')}</Button> },
                        { node: <Button variant="text" fgColor={tabIndex === 1 ? 'success' : 'surface-foreground'}>{t('common.email')}</Button> },
                    ]}
                    tabContents={[
                        <SmsAuth done={() => { if (onClose) onClose() }} />,
                        <EmailAuth done={() => { if (onClose) onClose() }} />
                    ]}
                    onActiveTabChange={i => setTabIndex(i)}
                    containerProps={{ stackProps: { className: 'h-[11cm]' } }}
                />
            </Stack>
        </Modal>
    )
}
