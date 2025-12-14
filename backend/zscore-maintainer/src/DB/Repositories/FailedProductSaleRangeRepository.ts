import { Collection, Db, ClientSession } from "mongodb";
import { DateTime } from "luxon";
import { collectionName, FailedProductSaleRangeCreate, FailedProductSaleRangeInput, schemaVersion } from "../Models/FailedProductSaleRange";
import { IRepository, MongoDB } from "@monorepo/mongodb";
import { ISeedable } from '@monorepo/mongodb/dist/ISeedable';

export class FailedProductSaleRangeRepository implements IRepository {
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

    private async getCollection(): Promise<Collection<FailedProductSaleRangeCreate>> {
        return (await MongoDB.getDb()).collection<FailedProductSaleRangeCreate>(collectionName)
    }

    async create(failedProductSaleRange: FailedProductSaleRangeInput, now?: number) {
        try {
            const result = await (await this.getCollection()).insertOne({
                ...failedProductSaleRange,
                schemaVersion: schemaVersion,
                createdAt: now ?? DateTime.utc().toUnixInteger()
            }, { session: this.session })

            if (!result.acknowledged)
                throw new Error('Failed to store the app\'s options!')

            return result.insertedId
        } catch (e) {
            console.error(e)
            return false
        }
    }
}
