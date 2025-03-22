import { Collection, DeleteResult, Filter, InsertOneResult, ObjectId, SortDirection, UpdateResult } from 'mongodb'
import { Order, OrderCreate, OrderImmutable, OrderInput, OrderUpdate, schemaVersion } from '../Models/Order'
import { DateTime } from 'luxon'

export class OrderRepository {
    private collection: Collection<OrderCreate>

    constructor(collection: Collection<OrderCreate>) {
        this.collection = collection
    }

    async create(userId: string | ObjectId, order: OrderInput, cost: { [k: string]: number }): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        order.products = order.products.map(p => typeof p === 'string' ? ObjectId.createFromHexString(p) : p)

        let o: OrderCreate = {
            ...order,
            schemaVersion,
            userId,
            isPayed: false,
            isSent: false,
            cost,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await this.collection.insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async get(filter: Filter<Order>, sorts: { field: keyof Order, direction: SortDirection }[], limit: number, skip: number, userId?: string): Promise<Order[] | false> {
        try {
            let cursor = this.collection.find(userId === undefined ? filter : { $and: [filter, { userId: ObjectId.createFromHexString(userId) }] })

            sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Order | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) {
            console.error(e)
            return undefined
        }
    }

    async update(id: string, order: OrderUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: OrderImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }

    async updateForUser(userId: string | ObjectId, orderId: string | ObjectId, order: OrderUpdate): Promise<UpdateResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)
    
        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await this.collection.updateOne({ _id: orderId, userId }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutablesForUser(userId: string | ObjectId, orderId: string | ObjectId, immutableFields: OrderImmutable): Promise<UpdateResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)
    
        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await this.collection.updateOne({ _id: orderId, userId }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async deleteForUser(userId: string | ObjectId, orderId: string | ObjectId): Promise<DeleteResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)
    
        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await this.collection.deleteOne({ _id: orderId, userId }) }
        catch (e) { console.error(e); return false }
    }
}
