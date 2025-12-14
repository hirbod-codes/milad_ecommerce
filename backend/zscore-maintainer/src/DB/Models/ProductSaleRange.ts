import { boolean, InferType, mixed, number, object, string } from "yup";
import { likeObjectId } from "@monorepo/mongodb";

export const collectionName = 'productSaleRange'

export const schemaVersion = 'v1.0.0'

export const productSaleRangeSchema = object().required().strict(true).noUnknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    min: likeObjectId.required(),
    max: likeObjectId.required(),
    lastProcessed: likeObjectId.optional(),
    duration: number().required().strict(true).integer(),
    count: number().required().strict(true).integer(),
    zScoreCalculated: boolean().required(),
    createdAt: number().strict(true).required(),
    updatedAt: number().strict(true).required(),
})
export type ProductSaleRange = InferType<typeof productSaleRangeSchema>

export const productSaleRangeInputSchema = productSaleRangeSchema.pick(['min', 'max', 'duration', 'count']).required().strict(true).noUnknown(true)
export type ProductSaleRangeInput = InferType<typeof productSaleRangeInputSchema>

export const productSaleRangeCreateSchema = productSaleRangeSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ProductSaleRangeCreate = InferType<typeof productSaleRangeCreateSchema>

export const fields: (keyof ProductSaleRange)[] = Object.keys(productSaleRangeSchema.fields) as any
export const readableFields: (keyof Omit<ProductSaleRange, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
