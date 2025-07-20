import { InferType, mixed, number, object, string } from "yup";
import { likeObjectId } from "../common_schemas";

export const collectionName = 'productView'

export const schemaVersion = 'v1.0.0'

export const productViewSchema = object().required().strict(true).noUnknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    timestamp: mixed<string | Date>().required(),
    metadata: object().required().strict(true).noUnknown(true).shape({
        productId: likeObjectId.required(),
        userId: likeObjectId.required(),
        quantity: number().required(),
    }),
})
export type ProductView = InferType<typeof productViewSchema>

export const productViewInputSchema = productViewSchema.pick(['metadata']).required().strict(true).noUnknown(true)
export type ProductViewInput = InferType<typeof productViewInputSchema>

export const productViewCreateSchema = productViewSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ProductViewCreate = InferType<typeof productViewCreateSchema>

export const fields: (keyof ProductView)[] = Object.keys(productViewSchema.fields) as any
export const readableFields: (keyof Omit<ProductView, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
