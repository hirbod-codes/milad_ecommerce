import { ObjectId } from "mongodb/mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'productReview'

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

export const fields: string[] = Object.keys(productReviewSchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = []

export const productReviewCreateSchema = productReviewSchema.required().noUnknown(true).strict(true).pick(['content', 'rating', 'productId'])
export type ProductReviewCreate = InferType<typeof productReviewCreateSchema>
