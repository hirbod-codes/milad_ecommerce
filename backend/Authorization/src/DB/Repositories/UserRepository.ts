import { User } from "../Models/User";
import { Collection, InsertOneResult } from 'mongodb'

export class UserRepository {
    private collection: Collection<User>

    constructor(collection: Collection<User>) {
        this.collection = collection
    }

    async createUser(user: User): Promise<InsertOneResult> {
        return await this.collection.insertOne(user)
    }

    async getUserByEmail(email: string): Promise<User | null | undefined> {
        return await this.collection.findOne({ email })
    }

    async usernameExists(username: string): Promise<boolean> {
        return await this.collection.countDocuments({ username }) > 0
    }

    async phoneNumberExists(phoneNumber: string): Promise<boolean> {
        return await this.collection.countDocuments({ phoneNumber }) > 0
    }

    async emailExists(email: string): Promise<boolean> {
        return await this.collection.countDocuments({ email }) > 0
    }
}
