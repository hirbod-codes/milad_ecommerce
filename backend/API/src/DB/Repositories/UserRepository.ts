import { User } from "../Models/User";
import { Collection, ObjectId } from 'mongodb'

export class UserRepository {
    private collection: Collection<User>

    constructor(collection: Collection<User>) {
        this.collection = collection
    }

    async getById(id: string): Promise<User | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }
}
