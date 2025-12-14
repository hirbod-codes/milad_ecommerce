import { boolean, InferType, number, object, string } from "yup";
import { likeObjectId } from "@monorepo/mongodb";

export const collectionName = 'productViewRange'

export const schemaVersion = 'v1.0.0'

export const productViewRangeSchema = object().required().strict(true).noUnknown(true).shape({
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
export type ProductViewRange = InferType<typeof productViewRangeSchema>

export const productViewRangeInputSchema = productViewRangeSchema.pick(['min', 'max', 'duration', 'count']).required().strict(true).noUnknown(true)
export type ProductViewRangeInput = InferType<typeof productViewRangeInputSchema>

export const productViewRangeCreateSchema = productViewRangeSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ProductViewRangeCreate = InferType<typeof productViewRangeCreateSchema>

export const fields: (keyof ProductViewRange)[] = Object.keys(productViewRangeSchema.fields) as any
export const readableFields: (keyof Omit<ProductViewRange, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
