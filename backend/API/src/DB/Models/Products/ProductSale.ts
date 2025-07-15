import { date, InferType, mixed, number, object, string } from "yup";
import { likeObjectId } from "../common_schemas";

export const collectionName = 'productSale'

export const schemaVersion = 'v1.0.0'

export const productSaleSchema = object().required().strict(true).noUnknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    timestamp: mixed<string | Date>().required(),
    metadata: object().required().strict(true).noUnknown(true).shape({
        productId: likeObjectId.required(),
        userId: likeObjectId.required(),
        quantity: number().required(),
    }),
})
export type ProductSale = InferType<typeof productSaleSchema>

export const productSaleInputSchema = productSaleSchema.pick(['metadata']).required().strict(true).noUnknown(true)
export type ProductSaleInput = InferType<typeof productSaleInputSchema>

export const productSaleCreateSchema = productSaleSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ProductSaleCreate = InferType<typeof productSaleCreateSchema>

export const fields: (keyof ProductSale)[] = Object.keys(productSaleSchema.fields) as any
export const readableFields: (keyof Omit<ProductSale, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
