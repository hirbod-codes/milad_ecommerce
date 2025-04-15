import { Collection, DeleteResult, ObjectId } from 'mongodb'
import { MongoDB } from "../../mongodb";
import { PopularProduct, PopularProductCreate, PopularProductInput } from "../../Models/Products/PopularProduct";

export class PopularProductRepository extends MongoDB {
    private collection: Collection<PopularProductCreate>

    constructor(collection: Collection<PopularProductCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<PopularProductRepository> {
        return new PopularProductRepository(await MongoDB.getDbInstance().getPopularProductCollection())
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

    async get(): Promise<PopularProduct[]>
    async get(category: string): Promise<PopularProduct[]>
    async get(category?: string): Promise<PopularProduct[]> {
        try { return await (category ? this.collection.find({ category }) : this.collection.find()).toArray() }
        catch (e) { console.error(e); return [] }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
