import { TropicalYear, deltat, equationOfTime, equinox } from './astro'
import { number } from 'yup'
import { jd_to_gregorian } from './gregorian-calendar'
import type { PersianDate } from '.'

export const PERSIAN_WEEK_DAYS_FA = [
    'شنبه',
    'یکشنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنج‌شنبه',
    'جمعه',
]

export const PERSIAN_WEEK_DAYS_EN = [
    'Shanbeh',
    'Yekshanbeh',
    'Doshanbeh',
    'Seshanbeh',
    'Charshanbeh',
    'Panjshanbeh',
    'Jomeh',
]

export const PERSIAN_MONTHS_FA = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
]

export const PERSIAN_MONTHS_EN = [
    'Farvardin',
    'Ordibehesht',
    'Khordad',
    'Tir',
    'Mordad',
    'Shahrivar',
    'Mehr',
    'Aban',
    'Azar',
    'Dey',
    'Bahman',
    'Esfand',
]

export const PERSIAN_EPOCH = 1948320.5;

export function getPersianWeekDays(locale = 'en'): string[] {
    if (locale == 'en')
        return PERSIAN_WEEK_DAYS_EN
    else if (locale == 'fa')
        return PERSIAN_WEEK_DAYS_FA
    else
        throw new Error('Invalid value provided for locale parameter')
}

export function getPersianMonths(isLeapYear: boolean, locale = 'en'): { name: string, days: number }[] {
    let keys
    if (locale == 'en')
        keys = PERSIAN_MONTHS_EN
    else if (locale == 'fa')
        keys = PERSIAN_MONTHS_FA
    else
        throw new Error('Invalid value provided for locale parameter')

    const values: number[] = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, isLeapYear ? 30 : 29]

    return keys.map((k, i) => ({ name: k, days: values[i] }))
}

export function isLeapPersianYear(year: number): boolean {
    return (persian_to_jd({ year: year + 1, month: 1, day: 1 }) - persian_to_jd({ year, month: 1, day: 1 })) > 365;
}

/*  TEHRAN_EQUINOX  --  Determine Julian day and fraction of the
 *                      March equinox at the Tehran meridian in
 *                      a given Gregorian year.
*/
export function tehran_equinox(year: number): number {
    //  March equinox in dynamical time
    const equJED = equinox(year, 0);

    //  Correct for delta T to obtain Universal time
    const equJD = equJED - (deltat(year) / (24 * 60 * 60));

    //  Apply the equation of time to yield the apparent time at Greenwich
    const equAPP = equJD + equationOfTime(equJED);

    /*  Finally, we must correct for the constant difference between
        the Greenwich meridian andthe time zone standard for
    Iran Standard time, 52�30' to the East.  */

    const dtTehran = (52 + (30 / 60.0) + (0 / (60.0 * 60.0))) / 360;
    const equTehran = equAPP + dtTehran;

    return equTehran;
}


/*  TEHRAN_EQUINOX_JD  --  Calculate Julian day during which the
 *                         March equinox, reckoned from the Tehran
 *                         meridian, occurred for a given Gregorian
 *                         year.
*/
export function tehran_equinox_jd(year: number): number {
    const ep = tehran_equinox(year);
    const epg = Math.floor(ep);

    return epg;
}

/**   PERSIAN_YEAR  -- Determine the year in the Persian
*                       astronomical calendar in which a
*                       given Julian day falls.  Returns an
*                       array of two elements:
*                           [0]  Persian year
*                           [1]  Julian day number containing
*                               equinox for this year.
*/
export function persian_year(jd: number): number[] {
    let lasteq, nexteq;
    let guess = jd_to_gregorian(jd).year - 2

    lasteq = tehran_equinox_jd(guess);
    while (lasteq > jd) {
        guess--;
        lasteq = tehran_equinox_jd(guess);
    }
    nexteq = lasteq - 1;
    while (!((lasteq <= jd) && (jd < nexteq))) {
        lasteq = nexteq;
        guess++;
        nexteq = tehran_equinox_jd(guess);
    }
    const adr = Math.round((lasteq - PERSIAN_EPOCH) / TropicalYear) + 1;

    return [adr, lasteq]
}

/**  JD_TO_PERSIAN  --  Calculate date in the Persian astronomical
 *                      calendar from Julian day.  
*/
export function jd_to_persian(jd: number): PersianDate {
    jd = Math.floor(jd) + 0.5;
    const adr = persian_year(jd);
    const year = adr[0];
    const equinox = adr[1];
    let day = Math.floor((jd - equinox) / 30) + 1;

    const yday = (Math.floor(jd) - persian_to_jd({ year, month: 1, day: 1 })) + 1;
    const month = (yday <= 186) ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
    day = (Math.floor(jd) - persian_to_jd({ year, month, day: 1 })) + 1;

    return { year, month, day }
}

/**  PERSIAN_TO_JD  --  Obtain Julian day from a given Persian
 *                      astronomical calendar date.
 * @param date one based
*/
export function persian_to_jd(date: PersianDate): number {
    let guess = (PERSIAN_EPOCH - 1) + (TropicalYear * ((date.year - 1) - 1));
    let adr = [date.year - 1, 0]

    while (adr[0] < date.year) {
        adr = persian_year(guess);
        guess = adr[1] + (TropicalYear + 2);
    }
    const equinox = adr[1];

    const jd = equinox +
        ((date.month <= 7) ?
            ((date.month - 1) * 31) :
            (((date.month - 1) * 30) + 6)
        ) +
        (date.day - 1);
    return jd;
}

export function validatePersianYear(date: PersianDate): void {
    if (!number().required().positive().integer().min(0).isValidSync(date.year))
        throw new Error(`Invalid year provided(${date.year}) in Persian calendar.`)
}

export function validatePersianMonth(date: PersianDate): void {
    if (!number().required().positive().integer().min(0).max(11).isValidSync(date.month))
        throw new Error(`Invalid month provided(${date.month}) in Persian calendar.`)
}

export function validatePersianDay(date: PersianDate): void {
    if (!number().required().positive().integer().min(0).max(30).isValidSync(date.day) || date.day >= getPersianMonths(isLeapPersianYear(date.year), 'en')[date.month].days)
        throw new Error(`Invalid day provided(${date.day}) in Persian calendar.`)
}

/**
 * @param date month and day parameters are zero based
 * 
 * @throws Error if invalid
 */
export function validatePersianDate(date: PersianDate): void {
    validatePersianYear(date)
    validatePersianMonth(date)
    validatePersianDay(date)
}
