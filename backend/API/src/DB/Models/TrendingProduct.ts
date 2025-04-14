import { InferType, number, object, string } from "yup";
import { likeObjectId } from "./common_schemas";

export const collectionName = 'trendingProduct'

export const schemaVersion = 'v1.0.0'

export const productSchema = object().required().strict(true).unknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    productId: likeObjectId.required(),
    createdAt: number().strict(true).required(),
    updatedAt: number().strict(true).required(),
})
export type Product = InferType<typeof productSchema>

export const productInputSchema = productSchema.pick(['productId']).required().strict(true).unknown(true)
export type ProductInput = InferType<typeof productInputSchema>

export const productCreateSchema = productSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).unknown(true)
export type ProductCreate = InferType<typeof productCreateSchema>

export const fields: (keyof Product)[] = Object.keys(productSchema.fields) as any
export const readableFields: (keyof Omit<Product, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
