import { ObjectId } from "mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'refreshTokens'

export const refreshTokenSchema = object().required().shape({
    schemaVersion: string().optional().min(6).max(10),
    _id: mixed<string | ObjectId>().optional(),
    refreshToken: string().required(),
    username: string().required(),
    expiresAt: number().required(),
    createdAt: number().optional(),
})

export type RefreshToken = InferType<typeof refreshTokenSchema>

export const fields: (keyof RefreshToken)[] = [
    'schemaVersion',
    '_id',
    'refreshToken',
    'username',
    'expiresAt',
    'createdAt',
]
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = readableFields.filter(f => !['_id', 'createdAt', 'expiresAt'].includes(f))

