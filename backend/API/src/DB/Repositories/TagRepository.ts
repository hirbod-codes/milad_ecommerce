import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb/mongodb'
import { DateTime } from 'luxon'
import { Tag, TagCreate, TagInput, TagUpdate, schemaVersion } from '../Models/Tag'

export class TagRepository {
    private collection: Collection<TagCreate>

    constructor(collection: Collection<TagCreate>) {
        this.collection = collection
    }

    async create(tag: TagInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let o: TagCreate = {
            ...tag,
            schemaVersion,
            views: 0,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await this.collection.insertOne(o) }
        catch (e) {
            console.error(e)
            return false
        }
    }

    async getById(id: string): Promise<Tag | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async updateById(id: string, tag: TagUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...tag, updatedAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async deleteById(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
