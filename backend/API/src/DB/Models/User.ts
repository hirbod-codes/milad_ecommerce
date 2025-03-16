import { InferType, number, object, string } from "yup";
import { likeObjectId } from "./common_schemas";

export const collectionName = 'user'

export const schemaVersion = 'v1.0.0'

export const userSchema = object().required().stripUnknown().strict(true).shape({
    schemaVersion: string().optional().min(6).max(20),
    _id: likeObjectId.required(),
    role: string().required(),
    username: string().required(),
    phoneNumber: string().optional().matches(/^09[0-9]{9}$/),
    email: string().optional().email(),
    firstName: string().optional(),
    lastName: string().optional(),
    createdAt: number().optional(),
    updatedAt: number().optional(),
})

export type User = InferType<typeof userSchema>

export const fields: string[] = Object.keys(userSchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion', 'password', 'passwordSalt', 'passwordIterations'].includes(f))
export const updatableFields = []
