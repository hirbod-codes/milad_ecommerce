import { Category } from "@/src/Components/SearchCategory"
import { Calendar, LanguageCodes } from "../../Localization"
import { ThemeOptions } from "../../Theme"

export type TimeZone = 'UTC' | 'Asia/Tehran'

export type Direction = 'ltr' | 'rtl'

export type Local = {
    zone: TimeZone
    calendar: Calendar
    language: LanguageCodes
    direction: Direction
}

export type Config = {
    local: Local
    themeOptions: ThemeOptions
    categories?: Category[]
    languages?: string[]
    columnPinningModels?: { [k: string]: ColumnPinningState }
    columnVisibilityModels?: { [k: string]: VisibilityState }
    columnOrderModels?: { [k: string]: string[] }
    tableDensity?: { [k: string]: Density }
}
