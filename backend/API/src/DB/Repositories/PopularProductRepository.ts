import { DateTime } from "luxon";
import { Collection, DeleteResult, InsertOneResult, ObjectId } from 'mongodb'
import { MongoDB } from "../mongodb";
import { PopularProduct, PopularProductCreate, PopularProductInput } from "../Models/PopularProduct";
import { OrderRepository } from "./OrderRepository";
import { Product } from "../Models/Product";

export class PopularProductRepository extends MongoDB {
    private collection: Collection<PopularProductCreate>

    constructor(collection: Collection<PopularProductCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<PopularProductRepository> {
        return new PopularProductRepository(await MongoDB.getDbInstance().getPopularProductCollection())
    }

    static async seed() {
        console.log('PopularProductRepository.seed()')
    }

    async set(records: PopularProductInput[]) {
        await this.startTransaction()

        try {
            const deletionResult = await this.collection.deleteMany()
            if (!deletionResult.acknowledged)
                await this.abortTransaction()

            const r = await this.collection.insertMany(records)
        } catch (e) {
            console.error(e)
            await this.abortTransaction()
        }
    }

    async get(): Promise<PopularProduct[]> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return [] }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
