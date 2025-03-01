import { useState, useContext, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Date } from '@/src/Lib/DateTime';
import { ConfigurationContext } from '@/src/Contexts/Configuration/ConfigurationContext';
import { getLocaleMonths } from '@/src/Lib/DateTime/date-time-helpers';
import { InputGroup } from '../InputGroup';
import { t } from 'i18next';
import { Select } from '../Select';

export function DateField({ defaultDate, width = '7rem', onChange, id }: { defaultDate?: Date; width?: string; onChange?: (date: Date) => void; id?: string }) {
    const local = useContext(ConfigurationContext)!.local;
    const localeMonths = getLocaleMonths(local, DateTime.local({ zone: local.zone }).year);

    const [year, setYear] = useState<number | undefined>(undefined);
    const [month, setMonth] = useState<number | undefined>(undefined);
    const [day, setDay] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (!year && defaultDate?.year)
            setYear(defaultDate.year);

        if (!month && defaultDate?.month)
            setMonth(defaultDate.month);

        if (!day && defaultDate?.day)
            setDay(defaultDate.day);
    }, [])

    return (
        <>
            <InputGroup
                fields={[
                    {
                        type: 'input',
                        props: {
                            id,
                            placeholder: t('common.Year'),
                            style: { width },
                            value: year ?? '',
                            onChange: (e) => {
                                try {
                                    setYear(Number(e.target.value))

                                    if (month !== undefined && day !== undefined) {
                                        if (onChange)
                                            onChange({ year: Number(e.target.value), month, day });
                                    }
                                } catch (error) { console.error('year', error); return; }
                            }
                        },
                    },
                    {
                        type: 'select',
                        props: {
                            id,
                            inputProps: { className: 'w-[3.5cm]' },
                            children: localeMonths.map((e, i) => <Select.Item value={e.name} key={i}>{e.name}</Select.Item>),
                            defaultValue: defaultDate?.month !== undefined ? localeMonths[defaultDate?.month - 1].name : undefined,
                            onValueChange(v) {
                                let m = localeMonths.findIndex(f => f.name === v) + 1
                                setMonth(m)

                                if (year !== undefined && day !== undefined)
                                    if (onChange)
                                        onChange({ year: year, month: m, day: day })
                            },
                        }
                    },
                    {
                        type: 'input',
                        props: {
                            id,
                            placeholder: t('common.Day'),
                            style: { width },
                            value: day ?? '',
                            onChange: (e) => {
                                try {
                                    const day = Number(e.target.value);
                                    if (month === undefined || year === undefined)
                                        setDay(day);
                                    else {
                                        setDay(day);
                                        if (onChange)
                                            onChange({ year: year, month: month, day: day });
                                    }
                                } catch (error) { console.error('day', error); return; }
                            }
                        }
                    }
                ]}
            />
        </>
    );
}
