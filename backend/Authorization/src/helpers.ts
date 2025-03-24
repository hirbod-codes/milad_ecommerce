import { boolean, BooleanSchema, number, NumberSchema, string, StringSchema } from "yup";
import http from "http";
import https from "https";

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

export function getStringEnv(key: string, message?: string, validate?: (schema: StringSchema) => StringSchema, manuallyValidate?: (env?: string) => boolean): string | undefined {
    const env = process.env[key]

    validateStringEnv(env, message, validate, manuallyValidate)

    return env
}

export function getIntegerEnv(key: string, message?: string, validate?: (schema: NumberSchema) => NumberSchema, manuallyValidate?: (env?: number) => boolean): number | undefined {
    const env = Number(process.env[key])

    validateIntegerEnv(env, message, validate, manuallyValidate)

    return env
}

export function getBooleanEnv(key: string, message?: string, validate?: (schema: BooleanSchema) => BooleanSchema, manuallyValidate?: (env?: boolean) => boolean): boolean | undefined {
    const env = Boolean(process.env[key])

    validateBooleanEnv(env, message, validate, manuallyValidate)

    return env
}

export async function httpRequest(options: http.RequestOptions, sendData?: string) {
    return new Promise<{ response: http.IncomingMessage, data: string }>((resolve, reject) => {
        const request = http.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                resolve({ response, data })
            });

            response.on('error', (e) => {
                console.error(e)
                reject(e)
            });
        });

        request.on('error', (e) => {
            console.error(e)
            reject(e)
        });

        if (sendData)
            request.write(sendData);

        request.end();
    })
}

export async function httpsRequest(options: https.RequestOptions, sendData?: string) {
    return new Promise<{ response: https.RequestOptions, data: string }>((resolve, reject) => {
        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                resolve({ response, data })
            });

            response.on('error', (e) => {
                console.error(e)
                reject(e)
            });
        });

        request.on('error', (e) => {
            console.error(e)
            reject(e)
        });

        if (sendData)
            request.write(sendData);

        request.end();
    })
}

export async function tryAndWait(callback: CallableFunction, secondsToWaitForEachTry: number = 5): Promise<boolean> {
    let safety = 0
    while (safety <= 100) {
        safety++
        try {
            await callback()
            return true
        }
        catch (e) { console.error(e) }
        finally {
            await (() => new Promise<void>((res, rej) => {
                console.log('waiting for 5 seconds...')
                setTimeout(() => { res() }, secondsToWaitForEachTry * 1000)
            }))()
        }
    }

    if (safety > 100) {
        console.log('safety reached!!')
        return false
    }

    return true
}
