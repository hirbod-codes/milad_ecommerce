import { Collection, InsertOneResult, ObjectId } from 'mongodb/mongodb'
import { Order, OrderCreate, OrderInput, schemaVersion } from '../Models/Order'
import { DateTime } from 'luxon'
import { productRepository } from 'src'

export class OrderRepository {
    private collection: Collection<OrderCreate>

    constructor(collection: Collection<OrderCreate>) {
        this.collection = collection
    }

    async create(order: OrderInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let currencyUnit = 'a'
        let cost: { [k: string]: number | undefined } | undefined = undefined
        try { cost = { [currencyUnit]: (await productRepository.getByIds(order.products))?.reduce((p, c) => p + c.price[currencyUnit], 0) ?? undefined } }
        catch (e) { console.error(e) }

        if (cost === undefined || cost[currencyUnit] === undefined)
            return false

        let o: OrderCreate = {
            ...order,
            schemaVersion,
            isPayed: false,
            isSent: false,
            cost,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await this.collection.insertOne(o) }
        catch (e) {
            console.error(e)
            return false
        }
    }

    async getById(id: string): Promise<Order | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) {
            console.error(e)
            return undefined
        }
    }
}
