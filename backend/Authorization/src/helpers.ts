import { boolean, BooleanSchema, number, NumberSchema, string, StringSchema } from "yup";

export function validateBooleanEnv(env?: boolean, message?: string, validate?: (schema: BooleanSchema) => BooleanSchema, manuallyValidate?: (env?: boolean) => boolean) {
    let schema: any = boolean().required()

    if (validate)
        schema = validate(schema)

    if (!schema.isValidSync(env))
        throw new Error(message ?? 'Invalid environment variable provided')

    if (manuallyValidate !== undefined && manuallyValidate(env) === false)
        throw new Error(message ?? 'Invalid environment variable provided')
}

export function validateStringEnv(env?: string, message?: string, validate?: (schema: StringSchema) => StringSchema, manuallyValidate?: (env?: string) => boolean) {
    let schema: any = string().required()

    if (validate)
        schema = validate(schema)

    if (!schema.isValidSync(env))
        throw new Error(message ?? 'Invalid environment variable provided')

    if (manuallyValidate !== undefined && manuallyValidate(env) === false)
        throw new Error(message ?? 'Invalid environment variable provided')
}

export function validateIntegerEnv(env?: number, message?: string, validate?: (schema: NumberSchema) => NumberSchema, manuallyValidate?: (env?: number) => boolean) {
    let schema: any = number().required()

    if (validate)
        schema = validate(schema)

    if (!schema.isValidSync(env) || !Number.isFinite(env) || !Number.isInteger(env))
        throw new Error(message ?? 'Invalid environment variable provided')

    if (manuallyValidate !== undefined && manuallyValidate(env) === false)
        throw new Error(message ?? 'Invalid environment variable provided')
}

export function getStringEnv(key: string, message?: string, validate?: (schema: StringSchema) => StringSchema, manuallyValidate?: (env?: string) => boolean): string {
    const env = process.env[key]

    validateStringEnv(env, message, validate, manuallyValidate)

    return env!
}

export function getIntegerEnv(key: string, message?: string, validate?: (schema: NumberSchema) => NumberSchema, manuallyValidate?: (env?: number) => boolean): number {
    const env = Number(process.env[key])

    validateIntegerEnv(env, message, validate, manuallyValidate)

    return env!
}

export function getBooleanEnv(key: string, message?: string, validate?: (schema: BooleanSchema) => BooleanSchema, manuallyValidate?: (env?: boolean) => boolean): boolean {
    const env = Boolean(process.env[key])

    validateBooleanEnv(env, message, validate, manuallyValidate)

    return env!
}
