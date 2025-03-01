import { ComponentProps, useState } from 'react';
import { Time } from '@/src/Lib/DateTime';
import { Input } from '../Input';
import { t } from 'i18next';

export function TimeField({ defaultTime, onChange, inputProps }: { defaultTime?: Time; onChange?: (time: Time) => void; inputProps?: ComponentProps<typeof Input> }) {
    const [time, setTime] = useState<string>(defaultTime ? `${defaultTime.hour}:${defaultTime.minute}:${defaultTime.second}` : '');
    const [error, setError] = useState<string | undefined>(undefined);

    return (
        <Input
            type='text'
            value={time}
            errorText={error}
            animateHeight={true}
            onChange={(e) => {
                setTime(e.target.value)

                try {
                    let [h, m, s] = e.target.value.split(':').map(s => parseInt(s))
                    if (!Number.isInteger(h) || !Number.isInteger(m) || !Number.isInteger(s)) {
                        setError(t('TimeField.invalidTimeFormat'))
                        return
                    }

                    if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) {
                        setError(t('TimeField.invalidTimeFormat'))
                        return
                    }

                    setError(undefined)

                    if (onChange)
                        onChange({ hour: h, minute: m, second: s, })
                }
                catch (e) {
                    setError(t('TimeField.invalidTimeFormat'))
                }
            }}
            style={{ width: '7rem' }}
            {...inputProps}
        />
    );
}
