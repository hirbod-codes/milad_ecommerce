import { useState } from 'react';
import { DateField } from './DateField';
import { Date, Time } from '@/src/Lib/DateTime';
import { TimeField } from './TimeField';

export function DateTimeField({ defaultDate, defaultTime, onChange, onDateChange, onTimeChange }: { defaultTime?: Time; defaultDate?: Date; onChange?: ({ time, date }: { time: Time; date: Date; }) => void; onDateChange?: (date: Date) => void; onTimeChange?: (time: Time) => void; }) {
    const [date, setDate] = useState<Date | undefined>(defaultDate);
    const [time, setTime] = useState<Time | undefined>(defaultTime);

    return (
        <>
            <DateField
                defaultDate={defaultDate}
                onChange={(d) => {
                    setDate(d);

                    if (onDateChange)
                        onDateChange(d);

                    if (onChange && time)
                        onChange({ time, date: d });

                }} />
            <TimeField
                defaultTime={defaultTime}
                onChange={(t) => {
                    setTime(t);

                    if (onTimeChange)
                        onTimeChange(t);

                    if (onChange && date)
                        onChange({ date, time: t });

                }} />
        </>
    );
}
