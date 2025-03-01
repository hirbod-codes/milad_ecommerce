export type Time = {
    hour: number,
    minute: number,
    second: number,
    millisecond?: number,
}

export type Duration = Time

export type Date = {
    year: number,
    month: number,
    day: number,
}

export type DateTimeView = {
    date: Date,
    time: Time,
}

export type GregorianDate = Date

export type PersianDate = Date
