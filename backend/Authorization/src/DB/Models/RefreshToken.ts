import { InferType, number, object, string } from "yup";
import { likeObjectId } from "./common_schemas";

export const collectionName = 'refreshTokens'

export const refreshTokenSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().optional().min(6).max(10),
    _id: likeObjectId.optional(),
    refreshToken: string().required().max(350),
    accessToken: string().required().max(350),
    userId: likeObjectId.required(),
    role: string().required(),
    expiresAt: number().required(),
    createdAt: number().optional(),
})

export type RefreshToken = InferType<typeof refreshTokenSchema>

export const refreshTokenInputSchema = refreshTokenSchema.required().noUnknown(true).strict(true).omit(['schemaVersion', '_id', 'createdAt'])
export type RefreshTokenInput = InferType<typeof refreshTokenInputSchema>

export const refreshTokenCreateSchema = refreshTokenSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: likeObjectId.optional() })
for (const field in refreshTokenCreateSchema.fields)
    if (Object.prototype.hasOwnProperty.call(refreshTokenCreateSchema.fields, field))
        (refreshTokenCreateSchema.fields as any)[field] = (refreshTokenCreateSchema.fields as any)[field].optional()
export type RefreshTokenCreate = InferType<typeof refreshTokenCreateSchema>

export const fields: (keyof RefreshToken)[] = Object.keys(refreshTokenSchema.fields) as any
export const readableFields: (keyof Omit<RefreshToken, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any

