import { ObjectId, Collection, Db, ClientSession } from "mongodb";
import { schemaVersion as zScoreMaintainerOptionsSchemaVersion, collectionName, ZScoreMaintainerOptionsCreate } from "../Models/zScoreMaintainerOptions";
import { DateTime } from "luxon";
import { IRepository, MongoDB } from "@monorepo/mongodb";
import { ISeedable } from '@monorepo/mongodb/dist/ISeedable';

export class ZScoreMaintainerOptionsRepository implements IRepository {
    IRepository: 'IRepository' = 'IRepository';

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

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    private async getCollection(): Promise<Collection<ZScoreMaintainerOptionsCreate>> {
        return (await MongoDB.getDb()).collection<ZScoreMaintainerOptionsCreate>(collectionName)
    }

    async createOptions() {
        try {
            const collection = await this.getCollection()

            let options = await collection.findOne()
            if (options)
                return options._id

            const result = await collection.insertOne({
                schemaVersion: zScoreMaintainerOptionsSchemaVersion,
                lastProcessedSaleId: undefined,
                lastProcessedViewId: undefined,
                addresses: [],
                updatedAt: DateTime.utc().toUnixInteger(),
                createdAt: DateTime.utc().toUnixInteger(),
            }, { session: this.session })
            if (!result.acknowledged)
                throw new Error('Failed to store the app\'s options!')

            return result.insertedId
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async getOptions() {
        return await (await this.getCollection()).findOne()
    }

    async setLastProcessedSaleId(id: string) {
        try { return await (await this.getCollection()).updateOne({}, { $set: { lastProcessedSaleId: ObjectId.createFromHexString(id), updatedAt: DateTime.utc().toUnixInteger() } }, { session: this.session }) }
        catch (e) { console.error(e); return false }
    }

    async setLastProcessedViewId(id: string) {
        try { return await (await this.getCollection()).updateOne({}, { $set: { lastProcessedViewId: ObjectId.createFromHexString(id), updatedAt: DateTime.utc().toUnixInteger() } }, { session: this.session }) }
        catch (e) { console.error(e); return false }
    }

    async pushSubscriber(host: string, port: number) {
        try {
            await (await this.getCollection()).updateOne({}, { $pull: { addresses: { host } } }, { session: this.session })
            return await (await this.getCollection()).updateOne({}, { $push: { addresses: { host, port } }, $set: { updatedAt: DateTime.utc().toUnixInteger() } }, { session: this.session })
        }
        catch (e) { console.error(e); return false }
    }
}
