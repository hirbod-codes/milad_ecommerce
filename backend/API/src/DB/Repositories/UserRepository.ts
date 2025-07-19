import { User } from "../Models/User";
import { Collection, ObjectId } from 'mongodb'
import { MongoDB } from "../mongodb";

export class UserRepository extends MongoDB {
    private collection: Collection<User>

    constructor(collection: Collection<User>) {
        super();
        this.collection = collection
    }

    static async getInstance(mongoDB?: MongoDB): Promise<UserRepository> {
        return new UserRepository(await (mongoDB ? mongoDB : MongoDB.getDbInstance()).getUserCollection())
    }

    async getById(id: string): Promise<User | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async get(): Promise<User[]> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return [] }
    }
}
