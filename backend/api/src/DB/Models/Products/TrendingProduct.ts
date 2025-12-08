import { InferType, number, object } from "yup";
import { likeObjectId } from "@monorepo/mongodb";

export const collectionName = 'trendingProduct'

export const schemaVersion = 'v1.0.0'

export const trendingProductSchema = object().required().strict(true).noUnknown(true).shape({
    _id: likeObjectId.required(),
    timestamp: number().required(),
    productId: likeObjectId.required(),
})
export type TrendingProduct = InferType<typeof trendingProductSchema>

export const trendingProductInputSchema = trendingProductSchema.pick(['productId']).required().strict(true).noUnknown(true)
export type TrendingProductInput = InferType<typeof trendingProductInputSchema>

export const trendingProductCreateSchema = trendingProductSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type TrendingProductCreate = InferType<typeof trendingProductCreateSchema>

export const fields: (keyof TrendingProduct)[] = Object.keys(trendingProductSchema.fields) as any
export const readableFields: (keyof Omit<TrendingProduct, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
