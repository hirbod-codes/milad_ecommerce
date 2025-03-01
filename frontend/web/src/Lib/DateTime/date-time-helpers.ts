import { getGregorianMonths, gregorian_to_jd, isLeapGregorianYear, jd_to_gregorian } from "./gregorian-calendar"
import { getPersianMonths, isLeapPersianYear, jd_to_persian, persian_to_jd } from "./persian-calendar"
import { DateTime } from "luxon"
import type { Date, Time, GregorianDate, PersianDate, DateTimeView } from '.'
import { mixed } from "yup"
import { getLuxonLocale } from "../localization"
import { Local } from "../../../Electron/Configuration/renderer.d"

export const DATE_TIME = 'cccc d/M/y H:m:s'
export const DATE = 'cccc d/M/y'
export const TIME = 'H:m:s'

export function getLocaleMonths(locale: Local, year: number): { name: string, days: number }[] {
    if (locale.calendar === 'Persian')
        return getPersianMonths(isLeapPersianYear(year), locale.language)
    if (locale.calendar === 'Gregorian')
        return getGregorianMonths(isLeapGregorianYear(year), locale.language)

    throw new Error('An unknown calendar requested.')
}

/**
 * Convert Persian date to Gregorian date
 * @param date one based month and day
 */
export function persianToGregorian(date: PersianDate): GregorianDate {
    return jd_to_gregorian(persian_to_jd(date) + 0.5)
}

/**
 * Convert Gregorian date to Persian date
 * @param date one based month and day
 */
export function gregorianToPersian(date: GregorianDate): PersianDate {
    return jd_to_persian(gregorian_to_jd(date))
}

export function toDateTime(timestamp: number, toLocal: Local, fromLocal?: Local): DateTime
export function toDateTime(dateTime: DateTime, toLocal: Local, fromLocal?: Local): DateTime
export function toDateTime(dateTime: DateTimeView, toLocal: Local, fromLocal: Local): DateTime
export function toDateTime(dateTime: number | DateTime | DateTimeView, toLocal: Local, fromLocal?: Local): DateTime {
    if (!mixed<Local>().required().isValidSync(toLocal) || !mixed<Local>().optional().isValidSync(toLocal))
        throw new Error('Invalid arguments provided to toDateTime function.')

    if (typeof dateTime === 'number' || typeof dateTime === 'bigint')
        return toDateTime(DateTime.fromSeconds(dateTime, { zone: 'UTC' }), toLocal, { zone: 'UTC', calendar: 'Gregorian', direction: 'ltr', language: 'en' })
    else if (dateTime instanceof DateTime)
        return dateTime.reconfigure({ outputCalendar: toLocal.calendar === 'Gregorian' ? undefined : toLocal.calendar }).setLocale(getLuxonLocale(toLocal.language)).setZone(toLocal.zone)

    let convertedDateTimeView: DateTimeView
    if (fromLocal!.calendar === 'Persian')
        convertedDateTimeView = { time: dateTime.time, date: persianToGregorian(dateTime.date) }
    else
        convertedDateTimeView = dateTime

    return DateTime
        .local(convertedDateTimeView.date.year,
            convertedDateTimeView.date.month,
            convertedDateTimeView.date.day,
            dateTime.time.hour,
            dateTime.time.minute,
            dateTime.time.second,
            dateTime.time?.millisecond ?? 0,
            { locale: getLuxonLocale(fromLocal!.language), zone: fromLocal!.zone, outputCalendar: toLocal.calendar === 'Gregorian' ? undefined : toLocal.calendar })
        .setLocale(getLuxonLocale(toLocal.language))
        .setZone(toLocal.zone)

}

export function toDateTimeView(timestamp: number, toLocal: Local, fromLocal?: Local): DateTimeView
export function toDateTimeView(dateTime: DateTime, toLocal: Local, fromLocal: Local): DateTimeView
export function toDateTimeView(dateTime: DateTimeView, toLocal: Local, fromLocal: Local): DateTimeView
export function toDateTimeView(dateTime: number | DateTime | DateTimeView, toLocal: Local, fromLocal?: Local): DateTimeView {
    if (typeof dateTime === 'number' || typeof dateTime === 'bigint')
        return toDateTimeView(DateTime.fromSeconds(dateTime, { zone: 'UTC' }), toLocal, { zone: 'UTC', calendar: 'Gregorian', direction: 'ltr', language: 'en' })
    else if (dateTime instanceof DateTime)
        return toDateTimeView(getDateTimeView(dateTime.reconfigure({ outputCalendar: 'Gregorian' })), toLocal, { ...fromLocal!, calendar: 'Gregorian' })

    let convertedDateTimeView
    switch (toLocal.calendar) {
        case 'Persian':
            if (fromLocal!.calendar === 'Persian') {
                const gregorianView = persianToGregorian(dateTime.date)
                const dt = DateTime
                    .local(gregorianView.year, gregorianView.month, gregorianView.day, dateTime.time.hour, dateTime.time.minute, dateTime.time.second, dateTime.time?.millisecond ?? 0, { locale: getLuxonLocale(fromLocal!.language), zone: fromLocal!.zone })
                    .setLocale(getLuxonLocale(toLocal.language))
                    .setZone(toLocal.zone)
                // Converting again because when updating time zone, date might change too.
                convertedDateTimeView = { date: gregorianToPersian(gregorianView), time: getTimeView(dt) }
            }
            else {
                const dt = DateTime
                    .local(dateTime.date.year, dateTime.date.month, dateTime.date.day, dateTime.time.hour, dateTime.time.minute, dateTime.time.second, dateTime.time?.millisecond ?? 0, { locale: getLuxonLocale(fromLocal!.language), zone: fromLocal!.zone })
                    .setLocale(getLuxonLocale(toLocal.language))
                    .setZone(toLocal.zone)
                // When updating time zone, date might change too.
                convertedDateTimeView = { date: gregorianToPersian(dateTime.date), time: getTimeView(dt) }
            }
            break;

        case 'Gregorian':
            if (fromLocal!.calendar === 'Persian') {
                const gregorianView = persianToGregorian(dateTime.date)
                const dt = DateTime
                    .local(gregorianView.year, gregorianView.month, gregorianView.day, dateTime.time.hour, dateTime.time.minute, dateTime.time.second, dateTime.time?.millisecond ?? 0, { locale: getLuxonLocale(fromLocal!.language), zone: fromLocal!.zone })
                    .setLocale(getLuxonLocale(toLocal.language))
                    .setZone(toLocal.zone)
                // Converting again because when updating time zone, date might change too.
                convertedDateTimeView = { date: gregorianView, time: getTimeView(dt) }
            } else {
                const dt = DateTime
                    .local(dateTime.date.year, dateTime.date.month, dateTime.date.day, dateTime.time.hour, dateTime.time.minute, dateTime.time.second, dateTime.time?.millisecond ?? 0, { locale: getLuxonLocale(fromLocal!.language), zone: fromLocal!.zone })
                    .setLocale(getLuxonLocale(toLocal.language))
                    .setZone(toLocal.zone)
                // Converting again because when updating time zone, date might change too.
                convertedDateTimeView = { date: dateTime.date, time: getTimeView(dt) }
            }
            break;

        default:
            throw new Error('invalid value for calendar provided.')
    }

    return convertedDateTimeView
}

export function getDateView(dateTime: DateTime): Date {
    return {
        year: dateTime.year,
        month: dateTime.month,
        day: dateTime.day,
    }
}

export function getTimeView(dateTime: DateTime): Time {
    return {
        hour: dateTime.hour,
        minute: dateTime.minute,
        second: dateTime.second,
        millisecond: dateTime.millisecond,
    }
}

export function getDateTimeView(dateTime: DateTime): DateTimeView {
    return {
        date: getDateView(dateTime),
        time: getTimeView(dateTime)
    }
}

export function toFormat(timestamp: number, toLocal: Local, fromLocal?: Local, format?: string): string
export function toFormat(dateTime: DateTime, toLocal: Local, fromLocal: Local, format?: string): string
export function toFormat(dateTime: DateTimeView, toLocal: Local, fromLocal: Local, format?: string): string
export function toFormat(dateTime: number | DateTime | DateTimeView, toLocal: Local, fromLocal?: Local, format = DATE_TIME): string {
    return toDateTime(dateTime as any, toLocal, fromLocal).toFormat(format)
}
