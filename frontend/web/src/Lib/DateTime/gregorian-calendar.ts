import { mod } from './astro'
import { number } from 'yup'
import type { GregorianDate } from '.'

export const GREGORIAN_MONTHS_FA = [
    'جَنیوئری',
    'فِبریوئری',
    'مارچ',
    'اِیپریل',
    'مِی',
    'جون',
    'جولای',
    'آگِست',
    'سِپتِمبِر',
    'آکتوبِر',
    'نُوِمبِر',
    'دیسِمبِر',
]

export const GREGORIAN_MONTHS_EN = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]

export const GREGORIAN_WEEK_DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const GREGORIAN_WEEK_DAYS_FA = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const GREGORIAN_EPOCH = 1721425.5;

export function getGregorianWeekDays(locale = 'en'): string[] {
    if (locale == 'en')
        return GREGORIAN_WEEK_DAYS_EN
    else if (locale == 'fa')
        return GREGORIAN_WEEK_DAYS_FA
    else
        throw new Error('Invalid value provided for locale parameter')
}

/**
 * Is a given year a leap year in the Gregorian calendar ?
 * 
 * @param year 
 */
export function isLeapGregorianYear(year: number): boolean {
    return ((year % 4) == 0) && (!(((year % 100) == 0) && ((year % 400) != 0)));
}

export function getGregorianMonths(isLeapYear: boolean, locale = 'en'): { name: string, days: number }[] {
    let keys
    if (locale == 'en')
        keys = GREGORIAN_MONTHS_EN
    else if (locale == 'fa')
        keys = GREGORIAN_MONTHS_FA
    else
        throw new Error('Invalid value provided for locale parameter')

    const values: number[] = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    return keys.map((k, i) => ({ name: k, days: values[i] }))
}

/**
 * Determine Julian day from Gregorian date
 * 
 * @param year 
 * @param month One based month index
 * @param day One based day index
 * @returns Number of Julian days
 */
export function gregorian_to_jd(date: GregorianDate): number {
    return (GREGORIAN_EPOCH - 1) +
        (365 * (date.year - 1)) +
        Math.floor((date.year - 1) / 4) +
        (-Math.floor((date.year - 1) / 100)) +
        Math.floor((date.year - 1) / 400) +
        Math.floor((((367 * date.month) - 362) / 12) +
            ((date.month <= 2) ? 0 :
                (isLeapGregorianYear(date.year) ? -1 : -2)
            ) +
            date.day);
}

/**
 * Calculate Gregorian date from Julian day
 * 
 * @param jd Julian days
 * @returns An array of three members, [year, month(one based), day(one based)]
 */
export function jd_to_gregorian(jd: number): GregorianDate {
    let year

    const wjd = Math.floor(jd - 0.5) + 0.5;
    const depoch = wjd - GREGORIAN_EPOCH;
    const quadricent = Math.floor(depoch / 146097);
    const dqc = mod(depoch, 146097);
    const cent = Math.floor(dqc / 36524);
    const dcent = mod(dqc, 36524);
    const quad = Math.floor(dcent / 1461);
    const dquad = mod(dcent, 1461);
    const yindex = Math.floor(dquad / 365);
    year = (quadricent * 400) + (cent * 100) + (quad * 4) + yindex;
    if (!((cent == 4) || (yindex == 4))) {
        year++;
    }
    const yearday = wjd - gregorian_to_jd({ year, month: 1, day: 1 });
    const leapadj = (
        (wjd < gregorian_to_jd({ year, month: 3, day: 1 })) ? 0
            : (isLeapGregorianYear(year) ? 1 : 2)
    );
    const month = Math.floor((((yearday + leapadj) * 12) + 373) / 367);
    const day = (wjd - gregorian_to_jd({ year, month: month, day: 1 })) + 1;

    return { year, month, day }
}

export function validateGregorianYear(date: GregorianDate): void {
    if (!number().required().positive().integer().min(0).isValidSync(date.year))
        throw new Error(`Invalid year provided(${date.year}) in Gregorian calendar.`)
}

export function validateGregorianMonth(date: GregorianDate): void {
    if (!number().required().positive().integer().min(0).max(11).isValidSync(date.month))
        throw new Error(`Invalid month provided(${date.month}) in Gregorian calendar.`)
}

export function validateGregorianDay(date: GregorianDate): void {
    if (!number().required().positive().integer().min(0).max(30).isValidSync(date.day) || date.day >= getGregorianMonths(isLeapGregorianYear(date.year), 'en')[date.month].days)
        throw new Error(`Invalid day provided(${date.day}) in Gregorian calendar.`)
}

/**
 * @param date month and day parameters are zero based
 * 
 * @throws Error if invalid
 */
export function validateGregorianDate(date: GregorianDate): void {
    validateGregorianYear(date)
    validateGregorianMonth(date)
    validateGregorianDay(date)
}
