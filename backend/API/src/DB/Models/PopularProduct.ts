import { array, InferType, number, object, string } from "yup";
import { likeObjectId } from "./common_schemas";

export const collectionName = 'popularProduct'

export const schemaVersion = 'v1.0.0'

export const popularProductSchema = object().required().strict(true).noUnknown(true).shape({
    _id: likeObjectId.required(),
    category: string().required(),
    products: array().required().strict(true).of(likeObjectId.required()),
})
export type PopularProduct = InferType<typeof popularProductSchema>

export const popularProductInputSchema = popularProductSchema.pick(['category', 'products']).required().strict(true).noUnknown(true)
export type PopularProductInput = InferType<typeof popularProductInputSchema>

export const popularProductCreateSchema = popularProductSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type PopularProductCreate = InferType<typeof popularProductCreateSchema>

export const fields: (keyof PopularProduct)[] = Object.keys(popularProductSchema.fields) as any
export const readableFields: (keyof Omit<PopularProduct, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
