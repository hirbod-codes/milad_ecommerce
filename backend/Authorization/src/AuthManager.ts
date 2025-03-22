import Jwt from 'jsonwebtoken'
import type { StringValue } from "ms";
import { db, refreshTokenExpiresIn } from '.';
import { DeletionFailure } from './DB/Exceptions/DeletionFailure';
import { DateTime } from 'luxon';
import { InsertionFailure } from './DB/Exceptions/InsertionFailure';
import { RevokedAccessTokenManager } from './RevokedAccessTokens/RevokedAccessTokenManager';
import { privilegeNames } from "@/src/DB/Models/privilegeNames"
import { MongoServerError, ObjectId } from 'mongodb';
import { RefreshToken } from './DB/Models/RefreshToken';

export class AuthManager {
    static PRIVILEGE_NAMES: string[] = privilegeNames

    private jwtSecret: string
    private algorithm: Jwt.Algorithm
    private accessTokenExpiresIn: number | StringValue
    private refreshTokenExpiresIn: number | StringValue
    private issuer: string = 'Authorization Server'

    constructor(jwtSecret: string, algorithm: Jwt.Algorithm, accessTokenExpiresIn: number | StringValue, refreshTokenExpiresIn: number | StringValue) {
        this.jwtSecret = jwtSecret
        this.algorithm = algorithm
        this.accessTokenExpiresIn = accessTokenExpiresIn
        this.refreshTokenExpiresIn = refreshTokenExpiresIn
    }

    async generateToken(sub: string, role: string, expiresIn: number | StringValue, tokenMode: 'accessToken' | 'refreshToken'): Promise<string> {
        return new Promise<string>((resolve) => {
            let t = Jwt.sign({ sub, role, tokenMode }, this.jwtSecret, { issuer: this.issuer, expiresIn, algorithm: this.algorithm });
            resolve(t)
        })
    }

    async generateAccessToken(id: string | ObjectId, role: string): Promise<string> {
        if (typeof id !== 'string')
            id = id.toString()

        return await this.generateToken(id, role, this.accessTokenExpiresIn, 'accessToken')
    }

    async generateRefreshToken(id: string | ObjectId, role: string): Promise<string> {
        if (typeof id !== 'string')
            id = id.toString()

        return await this.generateToken(id, role, this.refreshTokenExpiresIn, 'refreshToken')
    }

    async generateTokens(userId: string | ObjectId, role: string): Promise<{ accessToken: string, refreshToken: string }> {
        if (typeof userId !== 'string')
            userId = userId.toString()

        let refreshTokenDoc = await (await db.getRefreshTokensCollection()).findOne({ userId })

        if (refreshTokenDoc)
            return {
                accessToken: await this.generateAccessToken(userId, role),
                refreshToken: refreshTokenDoc.refreshToken,
            }
        else {
            let tokens = {
                accessToken: await this.generateAccessToken(userId, role),
                refreshToken: await this.generateRefreshToken(userId, role),
            }

            const create = async () => {
                let r = await (await db.getRefreshTokensCollection()).insertOne({
                    userId: ObjectId.createFromHexString(userId),
                    role,
                    refreshToken: tokens.refreshToken,
                    accessToken: tokens.accessToken,
                    createdAt: DateTime.utc().toUnixInteger(),
                    expiresAt: DateTime.utc().plus({ seconds: refreshTokenExpiresIn }).toUnixInteger()
                })
                console.log('r', r)

                if (!r.acknowledged)
                    throw new InsertionFailure()
            }

            try {
                await create()
            } catch (e) {
                console.error(e)
                // Duplicate key
                if (e instanceof MongoServerError && e.code === 11000) {
                    let r = await (await db.getRefreshTokensCollection()).updateOne({ userId: ObjectId.createFromHexString(userId) }, {
                        $set: {
                            role,
                            refreshToken: tokens.refreshToken,
                            accessToken: tokens.accessToken,
                            expiresAt: DateTime.utc().plus({ seconds: refreshTokenExpiresIn }).toUnixInteger()
                        }
                    })
                    console.log('r', r)

                    if (!r.acknowledged)
                        throw new InsertionFailure()
                } else
                    throw e
            }

            return tokens
        }
    }

    async retrieveAccessToken(refreshToken: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                let userId: string | undefined = undefined
                try {
                    let payload = await this.verify(refreshToken, 'refreshToken')

                    if (payload === undefined) {
                        reject()
                        return
                    }

                    userId = payload?.sub

                    if (!userId) {
                        reject()
                        return
                    }
                }
                catch (e) { reject(e); return }

                // expired refresh tokens are automatically removed by MongoDB TTL index
                let doc = (await (await db.getRefreshTokensCollection()).findOne({ refreshToken }))
                if (!doc || (await this.verify(doc.refreshToken, 'refreshToken')) === undefined) {
                    reject()
                    return
                }

                let payload = Jwt.decode(doc.accessToken, { json: true })
                if (payload === null) {
                    reject()
                    return
                }

                const expirationTS = payload.exp
                if (expirationTS === undefined) {
                    reject()
                    return
                }

                if (DateTime.utc().toUnixInteger() < expirationTS)
                    await RevokedAccessTokenManager.set(doc.accessToken, 'true', expirationTS)

                const accessToken = await this.generateAccessToken(userId, doc.role)

                let r = (await (await db.getRefreshTokensCollection()).updateOne({ refreshToken }, { $set: { accessToken } }))
                if (!r.acknowledged) {
                    reject()
                    return
                }

                resolve(accessToken)
            } catch (e) {
                console.error(e)
                reject(e)
            }
        });
    }

    async revokeRefreshTokenByUserId(userId: string | ObjectId): Promise<boolean> {
        let refreshToken = await (await db.getRefreshTokensCollection()).findOne({ userId: typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId })
        if (!refreshToken)
            return false

        return await this.revokeRefreshToken(refreshToken)
    }

    async revokeRefreshToken(refreshToken: string | RefreshToken): Promise<boolean> {
        if (typeof refreshToken === 'string') {
            let t = await (await db.getRefreshTokensCollection()).findOne({ refreshToken })
            if (!t)
                return false
            refreshToken = t
        }

        const res = await Promise.all([
            await this.revokeToken(refreshToken.refreshToken, 'refreshToken'),
            await this.revokeToken(refreshToken.accessToken, 'accessToken'),
        ])
        if (res[0] === false || res[1] === false)
            return false

        let r = await (await db.getRefreshTokensCollection()).deleteMany({ refreshToken: refreshToken.refreshToken })

        if (!r.acknowledged)
            throw new DeletionFailure()

        return true
    }

    async revokeToken(token: string, tokenMode: 'accessToken' | 'refreshToken'): Promise<boolean> {
        let payload = await this.verify(token, tokenMode)

        if (payload !== undefined && payload?.exp !== undefined)
            await RevokedAccessTokenManager.set(token, 'true', payload.exp)

        return true
    }

    verify(token: string, tokenMode: 'accessToken' | 'refreshToken'): Promise<Jwt.JwtPayload | undefined> {
        return new Promise<Jwt.JwtPayload | undefined>((resolve, reject) => {
            Jwt.verify(token, this.jwtSecret, { complete: true, issuer: this.issuer, algorithms: [this.algorithm] }, (e, token) => {
                if (e) {
                    console.error(e)
                    resolve(undefined)
                } else if (typeof token!.payload === 'string') {
                    console.error('invalid token payload type was returned: ' + token!.payload)
                    resolve(undefined)
                } else if (token!.payload.tokenMode !== tokenMode)
                    resolve(undefined)
                else
                    resolve(token!.payload)
            })
        })
    }
}
