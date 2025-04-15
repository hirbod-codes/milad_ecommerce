import { date, InferType, number, object, string } from "yup";
import { likeObjectId } from "../common_schemas";

export const collectionName = 'productView'

export const schemaVersion = 'v1.0.0'

export const productViewSchema = object().required().strict(true).noUnknown(true).shape({
    _id: likeObjectId.required(),
    timestamp: number().required(),
    productId: likeObjectId.required(),
})
export type ProductView = InferType<typeof productViewSchema>

export const productViewInputSchema = productViewSchema.pick(['productId']).required().strict(true).noUnknown(true)
export type ProductViewInput = InferType<typeof productViewInputSchema>

export const productViewCreateSchema = productViewSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ProductViewCreate = InferType<typeof productViewCreateSchema>

export const fields: (keyof ProductView)[] = Object.keys(productViewSchema.fields) as any
export const readableFields: (keyof Omit<ProductView, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
