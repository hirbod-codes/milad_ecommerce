import { DateTime } from "luxon";
import { ClientSession, Collection, Db, DeleteResult, ObjectId, UpdateResult } from 'mongodb'
import { collectionName, ProductStatistics, ProductStatisticsCreate } from "../../Models/Products/ProductStatistics";
import { Product, ProductImmutable, ProductUpdate } from "../../Models/Products/Product";
import { MongoDB } from '@monorepo/mongodb'

export class ProductStatisticsRepository {
    private session: ClientSession | undefined = undefined

    setTransactionSession(session?: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    async addCollection(db: Db): Promise<void> {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.createCollection(collectionName)

        const indexes = await db.collection(collectionName).indexes()

        if (indexes.find(i => i.name === 'timestamp') === undefined)
            await db.createIndex(collectionName, { timestamp: -1 }, { name: 'timestamp' })

        if (indexes.find(i => i.name === 'productId') === undefined)
            await db.createIndex(collectionName, { productId: -1 }, { name: 'productId' })

        if (indexes.find(i => i.name === 'tags') === undefined)
            await db.createIndex(collectionName, { tags: 1 }, { name: 'tags' })

        if (indexes.find(i => i.name === 'categories') === undefined)
            await db.createIndex(collectionName, { categories: 1 }, { name: 'categories' })

        if (indexes.find(i => i.name === 'count') === undefined)
            await db.createIndex(collectionName, { count: -1 }, { name: 'count' })

        if (indexes.find(i => i.name === 'duration') === undefined)
            await db.createIndex(collectionName, { duration: -1 }, { name: 'duration' })

        if (indexes.find(i => i.name === 'zScore') === undefined)
            await db.createIndex(collectionName, { zScore: -1 }, { name: 'zScore' })
    }

    private async getCollection(): Promise<Collection<ProductStatisticsCreate>> {
        return (await MongoDB.getDb()).collection<ProductStatisticsCreate>(collectionName)
    }

    async getTrendingProducts(duration: 'monthly' | 'weekly' | 'yearly', categoryNames?: string[], tagNames?: string[], offset: number = 0, limit: number = 10): Promise<Product[] | false> {
        try {
            let durationSeconds, startTS
            switch (duration) {
                case 'weekly':
                    durationSeconds = 604_800
                    startTS = DateTime.utc().set({ hour: 0, minute: 0, second: 0 })
                    if (startTS.weekday !== 1)
                        startTS = startTS.minus({ days: startTS.weekday - 1 }).minus({ months: 1 })
                    break;
                case 'monthly':
                    durationSeconds = 2_592_000
                    startTS = DateTime.utc().set({ day: 1, hour: 0, minute: 0, second: 0 }).minus({ months: 12 })
                    break;
                case 'yearly':
                    durationSeconds = 31_104_000
                    startTS = DateTime.utc().set({ month: 1, day: 1, hour: 0, minute: 0, second: 0 }).minus({ years: 10 })
                    break;
                default:
                    throw new Error('invalid duration value provided')
            }

            const match: any = { duration: durationSeconds, timestamp: { $gte: startTS.toUnixInteger() } }

            if (categoryNames)
                match.categories = { $in: categoryNames }

            if (tagNames)
                match.tags = { $in: tagNames }

            return await (await this.getCollection()).aggregate<Product>()
                .match(match)
                .sort({ 'zScore': -1 })
                .skip(offset)
                .limit(limit)
                .lookup({
                    from: 'product',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                })
                .addStage({
                    $replaceRoot: { newRoot: { $arrayElemAt: ['$product', 0] } }
                })
                .toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async getTopSellingProducts(duration: 'monthly' | 'weekly' | 'yearly', categoryNames?: string[], tagNames?: string[], offset: number = 0, limit: number = 10): Promise<Product[] | false> {
        try {
            let durationSeconds, startTS
            switch (duration) {
                case 'weekly':
                    durationSeconds = 604_800
                    startTS = DateTime.utc().set({ hour: 0, minute: 0, second: 0 })
                    if (startTS.weekday !== 1)
                        startTS = startTS.minus({ days: startTS.weekday - 1 }).minus({ months: 1 })
                    break;
                case 'monthly':
                    durationSeconds = 2_592_000
                    startTS = DateTime.utc().set({ day: 1, hour: 0, minute: 0, second: 0 }).minus({ months: 12 })
                    break;
                case 'yearly':
                    durationSeconds = 31_104_000
                    startTS = DateTime.utc().set({ month: 1, day: 1, hour: 0, minute: 0, second: 0 }).minus({ years: 10 })
                    break;
                default:
                    throw new Error('invalid duration value provided')
            }

            const match: any = { duration: durationSeconds, timestamp: { $gte: startTS.toUnixInteger() } }

            if (categoryNames)
                match.categories = { $in: categoryNames }

            if (tagNames)
                match.tags = { $in: tagNames }

            return await (await this.getCollection()).aggregate<Product>()
                .match(match)
                .sort({ 'count': -1 })
                .skip(offset)
                .limit(limit)
                .lookup({
                    from: 'product',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                })
                .addStage({
                    $replaceRoot: { newRoot: { $arrayElemAt: ['$product', 0] } }
                })
                .toArray()
        }
        catch (e) { console.error(e); return false }
    }

    get(productIds: string | ObjectId | (string | ObjectId)[], since: number, to: number): Promise<ProductStatistics[]>[] | false {
        if (typeof productIds === 'string')
            productIds = [ObjectId.createFromHexString(productIds)]
        else if (productIds instanceof ObjectId)
            productIds = [productIds]
        else if (Array.isArray(productIds))
            productIds = productIds.map(m => typeof m === 'string' ? ObjectId.createFromHexString(m) : m)

        try { return productIds.map(async productId => (await this.getCollection()).find({ productId, timestamp: { $gte: since, $lte: to } }).toArray()) }
        catch (e) { console.error(e); return false }
    }

    async update(product: ProductUpdate, productId: string): Promise<UpdateResult | false> {
        try {
            const updatedAt = DateTime.utc().toUnixInteger()
            const updates: any = {}
            for (const key in product) {
                if (Object.prototype.hasOwnProperty.call(product, key)) {
                    const value = (product as any)[key]
                    updates[`product.${key}`] = value
                }
            }
            if (Object.keys(updates).length === 0)
                return false

            return await (await this.getCollection()).updateMany({ productId: typeof productId === 'string' ? ObjectId.createFromHexString(productId) : productId }, { $set: { ...updates, updatedAt, 'product.updatedAt': updatedAt } }, { session: this.session })
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async updateImmutables(productId: string | ObjectId, product: ProductImmutable): Promise<UpdateResult | false> {
        try {
            const updatedAt = DateTime.utc().toUnixInteger()
            const updates: any = {}
            for (const key in product) {
                if (Object.prototype.hasOwnProperty.call(product, key)) {
                    const value = (product as any)[key]
                    updates[`product.${key}`] = value
                }
            }
            if (Object.keys(updates).length === 0)
                return false

            return await (await this.getCollection()).updateMany({ productId: typeof productId === 'string' ? ObjectId.createFromHexString(productId) : productId }, { $set: { ...updates, updatedAt, 'product.updatedAt': updatedAt } }, { session: this.session })
        }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await (await this.getCollection()).deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
