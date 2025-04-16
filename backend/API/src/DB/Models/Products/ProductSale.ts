import { array, InferType, number, object, string } from "yup";
import { likeObjectId, uniqueArrayTest } from "../common_schemas";

export const collectionName = 'productSale'

export const schemaVersion = 'v1.0.0'

export const productSaleSchema = object().required().strict(true).noUnknown(true).shape({
    _id: likeObjectId.required(),
    timestamp: number().required(),
    productId: likeObjectId.required(),
    quantity: number().required(),
})
export type ProductSale = InferType<typeof productSaleSchema>

export const productSaleInputSchema = productSaleSchema.pick(['productId', 'quantity']).required().strict(true).noUnknown(true)
export type ProductSaleInput = InferType<typeof productSaleInputSchema>

export const productSaleCreateSchema = productSaleSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ProductSaleCreate = InferType<typeof productSaleCreateSchema>

export const fields: (keyof ProductSale)[] = Object.keys(productSaleSchema.fields) as any
export const readableFields: (keyof Omit<ProductSale, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
