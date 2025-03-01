import { string } from "yup"
import { i18n } from 'i18next';
import { LanguageCodes } from "../Localization";

export function getLuxonLocale(code: LanguageCodes): string
export function getLuxonLocale(i18n: i18n): string
export function getLuxonLocale(arg: i18n | LanguageCodes): string {
    if (!string().required().isValidSync(arg))
        arg = (arg as i18n).language as LanguageCodes;

    switch (arg) {
        case 'en':
            return 'en-US'
        case 'fa':
            return 'fa-IR'
        default:
            throw new Error('Unknown language encountered')
    }
}
