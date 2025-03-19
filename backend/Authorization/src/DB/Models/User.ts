import { InferType, number, object, string } from "yup";
import { likeObjectId } from "./common_schemas";

export const collectionName = 'user'

export const schemaVersion = 'v1.0.0'

export const userSchema = object().required().stripUnknown().strict(true).shape({
    schemaVersion: string().optional().min(6).max(10),
    _id: likeObjectId.required(),
    role: string().required(),
    username: string().required(),
    password: string().optional(),
    passwordSalt: string().optional(),
    passwordIterations: number().optional(),
    phoneNumber: string().optional().matches(/^09[0-9]{9}$/),
    email: string().optional().email(),
    firstName: string().optional(),
    lastName: string().optional(),
    avatarUrl: string().optional(),
    avatarFile: likeObjectId.optional(),
    createdAt: number().optional(),
    updatedAt: number().optional(),
})

export type User = InferType<typeof userSchema>

export const userInputSchema = userSchema.required().noUnknown(true).strict(true).omit(['schemaVersion', '_id', 'createdAt', 'updatedAt']).shape({ password: string().optional().min(8).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/) })
export type UserInput = InferType<typeof userInputSchema>

export const userCreateSchema = userSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: likeObjectId.optional() })
export type UserCreate = InferType<typeof userCreateSchema>

export const userUpdateSchema = userSchema.required().noUnknown(true).strict(true).pick(['lastName', 'firstName', 'avatarUrl', 'avatarFile'])
export type UserUpdate = InferType<typeof userUpdateSchema>

export const userImmutableSchema = userSchema.required().noUnknown(true).strict(true).pick(Object.keys(userSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(userUpdateSchema.fields)).includes(f)) as any)
export type UserImmutable = InferType<typeof userImmutableSchema>

export const fields: (keyof User)[] = Object.keys(userSchema.fields) as any
export const readableFields: (keyof Omit<User, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof UserUpdate)[] = Object.keys(userUpdateSchema.fields) as any
