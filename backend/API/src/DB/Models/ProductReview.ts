import { ObjectId } from "mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'productReview'

export const schemaVersion = 'v1.0.0'

export const productReviewSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    productId: mixed<string | ObjectId>().required(),
    userId: mixed<string | ObjectId>().required(),
    content: string().optional(),
    rating: number().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type ProductReview = InferType<typeof productReviewSchema>

export const productReviewInputSchema = productReviewSchema.required().noUnknown(true).strict(true).pick(['productId', 'userId', 'content', 'rating'])
export type ProductReviewInput = InferType<typeof productReviewInputSchema>

export const productReviewCreateSchema = productReviewSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: mixed<string | ObjectId>().optional() })
export type ProductReviewCreate = InferType<typeof productReviewCreateSchema>

export const productReviewUpdateSchema = productReviewSchema.required().noUnknown(true).strict(true).pick(['content', 'rating'])
export type ProductReviewUpdate = InferType<typeof productReviewUpdateSchema>

export const productReviewImmutableSchema = productReviewSchema.required().noUnknown(true).strict(true).pick(Object.keys(productReviewSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(productReviewUpdateSchema.fields)).includes(f)) as any)
export type ProductReviewImmutable = InferType<typeof productReviewImmutableSchema>

export const fields: (keyof ProductReview)[] = Object.keys(productReviewSchema.fields) as any
export const readableFields: (keyof Omit<ProductReview, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof ProductReviewUpdate)[] = Object.keys(productReviewUpdateSchema.fields) as any
