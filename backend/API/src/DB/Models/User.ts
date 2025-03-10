import { ObjectId } from "mongodb/mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'user'

export const userSchema = object().required().shape({
    schemaVersion: string().optional().min(6).max(10),
    _id: mixed<string | ObjectId>().optional(),
    username: string().required(),
    password: string().optional(),
    passwordSalt: string().optional(),
    passwordIterations: number().optional(),
    phoneNumber: string().optional().matches(/^09[0-9]{9}$/),
    email: string().optional().email(),
    firstName: string().optional(),
    lastName: string().optional(),
    avatarUrl: string().optional(),
    createdAt: number().optional(),
    updatedAt: number().optional(),
})

export type User = InferType<typeof userSchema>

export const fields: (keyof User)[] = [
    'schemaVersion',
    '_id',
    'username',
    'password',
    'passwordSalt',
    'passwordIterations',
    'phoneNumber',
    'email',
    'createdAt',
    'updatedAt',
]
export const readableFields = fields.filter(f => !['schemaVersion', 'password', 'passwordSalt', 'passwordIterations'].includes(f))
export const updatableFields = readableFields.filter(f => !['_id', 'updatedAt', 'createdAt', 'email', 'phoneNumber', 'username'].includes(f))
