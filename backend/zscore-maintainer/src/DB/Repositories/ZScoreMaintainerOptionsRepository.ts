import { ObjectId, Collection, Db, MongoClient } from "mongodb";
import { MongoDB } from "../../../../API/src/DB/mongodb";
import { schemaVersion as zScoreMaintainerOptionsSchemaVersion, collectionName, ZScoreMaintainerOptions, ZScoreMaintainerOptionsCreate } from "../Models/zScoreMaintainerOptions";
import { DateTime } from "luxon";

export class ZScoreMaintainerOptionsRepository extends MongoDB {
    private collection: Collection<ZScoreMaintainerOptionsCreate>

    constructor(collection: Collection<ZScoreMaintainerOptionsCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(client?: MongoClient, db?: Db): Promise<ZScoreMaintainerOptionsRepository> {
        return new ZScoreMaintainerOptionsRepository((db ? db : (await MongoDB.getDbInstance().getDb())).collection(collectionName))
    }

    async createOptions() {
        try {
            let options = await this.collection.findOne()
            if (options)
                return options._id

            const result = await this.collection.insertOne({
                schemaVersion: zScoreMaintainerOptionsSchemaVersion,
                lastProcessedSaleId: undefined,
                lastProcessedViewId: undefined,
                addresses: [],
                updatedAt: DateTime.utc().toUnixInteger(),
                createdAt: DateTime.utc().toUnixInteger(),
            })
            if (!result.acknowledged)
                throw new Error('Failed to store the app\'s options!')

            return result.insertedId
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async getOptions() {
        return await this.collection.findOne()
    }

    async setLastProcessedSaleId(id: string) {
        try { return await this.collection.updateOne({}, { $set: { lastProcessedSaleId: ObjectId.createFromHexString(id), updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async setLastProcessedViewId(id: string) {
        try { return await this.collection.updateOne({}, { $set: { lastProcessedViewId: ObjectId.createFromHexString(id), updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async pushSubscriber(host: string, port: number) {
        try {
            await this.collection.updateOne({}, { $pull: { addresses: { host } } })
            return await this.collection.updateOne({}, { $push: { addresses: { host, port } }, $set: { updatedAt: DateTime.utc().toUnixInteger() } })
        }
        catch (e) { console.error(e); return false }
    }
}
