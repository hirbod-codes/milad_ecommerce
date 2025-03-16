import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { Order, OrderCreate, OrderInput, OrderUpdate, schemaVersion } from '../Models/Order'
import { DateTime } from 'luxon'

export class OrderRepository {
    private collection: Collection<OrderCreate>

    constructor(collection: Collection<OrderCreate>) {
        this.collection = collection
    }

    async create(order: OrderInput, cost: { [k: string]: number }): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

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
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Order | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) {
            console.error(e)
            return undefined
        }
    }

    async updateById(id: string, order: OrderUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...order, updatedAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async deleteById(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
