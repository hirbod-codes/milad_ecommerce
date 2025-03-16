import { ObjectId } from "mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'refreshTokens'

export const refreshTokenSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().optional().min(6).max(10),
    _id: mixed<string | ObjectId>().optional(),
    refreshToken: string().required(),
    userId: string().required(),
    role: string().required(),
    expiresAt: number().required(),
    createdAt: number().optional(),
})

export type RefreshToken = InferType<typeof refreshTokenSchema>

export const refreshTokenInputSchema = refreshTokenSchema.required().noUnknown(true).strict(true).omit(['schemaVersion', '_id', 'createdAt'])
export type RefreshTokenInput = InferType<typeof refreshTokenInputSchema>

export const refreshTokenCreateSchema = refreshTokenSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: mixed<string | ObjectId>().optional() })
export type RefreshTokenCreate = InferType<typeof refreshTokenCreateSchema>

export const fields: (keyof RefreshToken)[] = Object.keys(refreshTokenSchema.fields) as any
export const readableFields: (keyof Omit<RefreshToken, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any

