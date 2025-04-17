import { DateTime } from "luxon"
import { Product } from "../../Models/Products/Product"

export class ZScore {
    static async calculate(product: Product, quantity: number, nowTS: number) {
        // Monthly
        if (product.stats.monthly.length > 0 && nowTS <= product.stats.monthly[product.stats.monthly.length - 1].from)
            throw new Error('Invalid nowTS provided')

        let diff = product.stats.monthly.length > 0 ? DateTime.fromSeconds(nowTS).diff(DateTime.fromSeconds(product.stats.monthly[product.stats.monthly.length - 1].from), 'months') : undefined
        if (diff && diff.months < 1) {
            product.stats.monthly[product.stats.monthly.length - 1].to = nowTS
            product.stats.monthly[product.stats.monthly.length - 1].count += quantity
        } else {
            if (product.stats.monthly.length > 0)
                product.stats.monthly[product.stats.monthly.length - 1].to = DateTime.fromSeconds(product.stats.monthly[product.stats.monthly.length - 1].from).plus({ months: 1 }).toUnixInteger()

            let tPointer
            if (product.stats.monthly.length > 0)
                tPointer = DateTime.fromSeconds(product.stats.monthly[product.stats.monthly.length - 1].to)
            else
                tPointer = DateTime.fromSeconds(nowTS).set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

            while (true) {
                if (tPointer.plus({ months: 1 }).toUnixInteger() > nowTS)
                    break

                product.stats.monthly.push({
                    from: tPointer.toUnixInteger(),
                    to: tPointer.plus({ months: 1 }).toUnixInteger(),
                    count: 0
                })

                tPointer = tPointer.plus({ months: 1 })
            }

            product.stats.monthly.push({
                from: tPointer.toUnixInteger(),
                to: nowTS,
                count: quantity
            })

            while (product.stats.monthly.length > 12)
                product.stats.monthly.shift()
        }

        // Weekly
        diff = product.stats.weekly.length > 0 ? DateTime.fromSeconds(nowTS).diff(DateTime.fromSeconds(product.stats.weekly[product.stats.weekly.length - 1].from), 'weeks') : undefined
        if (diff && diff.weeks <= 1) {
            product.stats.weekly[product.stats.weekly.length - 1].to = nowTS
            product.stats.weekly[product.stats.weekly.length - 1].count += quantity
        } else {
            if (product.stats.weekly.length > 0)
                product.stats.weekly[product.stats.weekly.length - 1].to = DateTime.fromSeconds(product.stats.weekly[product.stats.weekly.length - 1].from).plus({ weeks: 1 }).toUnixInteger()

            let tPointer
            if (product.stats.weekly.length > 0)
                tPointer = DateTime.fromSeconds(product.stats.weekly[product.stats.weekly.length - 1].to)
            else {
                tPointer = DateTime.fromSeconds(nowTS).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                if (tPointer.weekday > 1)
                    tPointer = tPointer.minus({ days: tPointer.weekday - 1 })
            }

            while (true) {
                if (tPointer.plus({ weeks: 1 }).toUnixInteger() > nowTS)
                    break

                product.stats.weekly.push({
                    from: tPointer.toUnixInteger(),
                    to: tPointer.plus({ weeks: 1 }).toUnixInteger(),
                    count: 0
                })

                tPointer = tPointer.plus({ weeks: 1 })
            }

            product.stats.weekly.push({
                from: tPointer.toUnixInteger(),
                to: nowTS,
                count: quantity
            })

            while (product.stats.monthly.length > 48)
                product.stats.monthly.shift()
        }

        product.stats.weeklyMean = product.stats.weekly.reduce((p, c) => p + c.count, 0) / product.stats.weekly.length
        product.stats.monthlyMean = product.stats.monthly.reduce((p, c) => p + c.count, 0) / product.stats.monthly.length

        product.stats.monthlyStandardDeviation = Math.sqrt(product.stats.monthly.reduce((p, c) => p + Math.pow(c.count - product.stats.monthlyMean, 2), 0) / (product.stats.monthly.length > 1 ? product.stats.monthly.length - 1 : product.stats.monthly.length))
        product.stats.weeklyStandardDeviation = Math.sqrt(product.stats.weekly.reduce((p, c) => p + Math.pow(c.count - product.stats.weeklyMean, 2), 0) / (product.stats.weekly.length > 1 ? product.stats.weekly.length - 1 : product.stats.weekly.length))

        product.stats.monthlyZScore = product.stats.monthlyStandardDeviation === 0 ? 0 : (quantity - product.stats.monthlyMean) / product.stats.monthlyStandardDeviation
        product.stats.weeklyZScore = product.stats.weeklyStandardDeviation === 0 ? 0 : (quantity - product.stats.weeklyMean) / product.stats.weeklyStandardDeviation

        return product.stats
    }
}
