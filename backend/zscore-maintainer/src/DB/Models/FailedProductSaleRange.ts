import { InferType, number, object, string } from "yup";
import { likeObjectId } from "../../../../API/src/DB/Models/common_schemas";

export const collectionName = 'failedProductSaleRange'

export const schemaVersion = 'v1.0.0'

export const failedProductSaleRangeSchema = object().required().strict(true).noUnknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    range: object().required().shape({
        min: likeObjectId.required(),
        max: likeObjectId.required()
    }),
    count: number().required(),
    createdAt: number().strict(true).required()
})
export type FailedProductSaleRange = InferType<typeof failedProductSaleRangeSchema>

export const failedProductSaleRangeInputSchema = failedProductSaleRangeSchema.pick(['range', 'count']).required().strict(true).noUnknown(true)
export type FailedProductSaleRangeInput = InferType<typeof failedProductSaleRangeInputSchema>

export const failedProductSaleRangeCreateSchema = failedProductSaleRangeSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type FailedProductSaleRangeCreate = InferType<typeof failedProductSaleRangeCreateSchema>

export const fields: (keyof FailedProductSaleRange)[] = Object.keys(failedProductSaleRangeSchema.fields) as any
export const readableFields: (keyof Omit<FailedProductSaleRange, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
