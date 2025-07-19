import { Collection, Db, MongoClient } from "mongodb";
import { MongoDB } from "../../mongodb";
import { ProductViewCreate, ProductViewInput, schemaVersion } from "../../Models/Products/ProductView";

export class ProductViewRepository extends MongoDB {
    private collection: Collection<ProductViewCreate>

    constructor(productViewCreate: Collection<ProductViewCreate>) {
        super();
        this.collection = productViewCreate
    }

    static async getInstance(mongoDB?: MongoDB): Promise<ProductViewRepository> {
        return new ProductViewRepository(await (mongoDB ? mongoDB : MongoDB.getDbInstance()).getProductViewCollection())
    }

    async create(productViewInput: ProductViewInput, now: number) {
        try {
            const p: ProductViewCreate = { ...productViewInput, count: 0, timestamp: now, schemaVersion: schemaVersion }
            const insertionResult = this.collection.insertOne(p, { session: this.session })
            return insertionResult
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async increment(productId: string) {
        try {
            // 
        } catch (e) {
            console.error(e)
            return false
        }
    }
}
