import { InferType, number, object, string } from "yup";
import { likeObjectId } from "@monorepo/mongodb";
import { productSchema } from "./Product";

export const collectionName = 'productStatistics'

export const schemaVersion = 'v1.0.0'

export const productStatisticsSchema = object().required().strict(true).noUnknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    productId: likeObjectId.required(),
    duration: number().required().min(1).integer(),
    timestamp: number().required(),
    count: number().required(),
    zScore: number().required().nullable(),
    viewCount: number().required(),
    viewZScore: number().required().nullable(),
    product: productSchema.required()
})
export type ProductStatistics = InferType<typeof productStatisticsSchema>

export const productStatisticsInputSchema = productStatisticsSchema.pick(['productId']).required().strict(true).noUnknown(true)
export type ProductStatisticsInput = InferType<typeof productStatisticsInputSchema>

export const productStatisticsCreateSchema = productStatisticsSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ProductStatisticsCreate = InferType<typeof productStatisticsCreateSchema>

export let productStatisticsUpdateSchema = productStatisticsSchema
    .pick(['product'])
    .required()
    .strict(true)
    .noUnknown(true)
    .partial()
export type ProductStatisticsUpdate = InferType<typeof productStatisticsUpdateSchema>

export const fields: (keyof ProductStatistics)[] = Object.keys(productStatisticsSchema.fields) as any
export const readableFields: (keyof Omit<ProductStatistics, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
