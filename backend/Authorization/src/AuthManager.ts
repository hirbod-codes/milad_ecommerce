import Jwt from 'jsonwebtoken'
import type { StringValue } from "ms";
import { db, refreshTokenExpiresIn } from '.';
import { DeletionFailure } from './DB/Exceptions/DeletionFailure';
import { DateTime } from 'luxon';
import { InsertionFailure } from './DB/Exceptions/InsertionFailure';
import { RevokedAccessTokenManager } from './RevokedAccessTokens/RevokedAccessTokenManager';
import { privilegeNames } from "@/src/DB/Models/privilegeNames"

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

    async generateToken(sub: string, role: string, expiresIn: number | StringValue): Promise<string> {
        return new Promise<string>((resolve) => {
            let t = Jwt.sign({ sub, role }, this.jwtSecret, { issuer: this.issuer, expiresIn, algorithm: this.algorithm });
            resolve(t)
        })
    }

    async generateAccessToken(id: string, role: string): Promise<string> {
        return await this.generateToken(id, role, this.accessTokenExpiresIn)
    }

    async generateRefreshToken(id: string, role: string): Promise<string> {
        return await this.generateToken(id, role, this.refreshTokenExpiresIn)
    }

    async generateTokens(userId: string, role: string): Promise<{
        accessToken: string,
        refreshToken: string,
    }> {
        let refreshTokenDoc = await (await db.getRefreshTokensCollection()).findOne({ userId, role })

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

            let r = await (await db.getRefreshTokensCollection()).insertOne({
                userId,
                role,
                refreshToken: tokens.refreshToken,
                accessToken: tokens.accessToken,
                createdAt: DateTime.utc().toUnixInteger(),
                expiresAt: DateTime.utc().plus({ seconds: refreshTokenExpiresIn }).toUnixInteger()
            })

            if (!r.acknowledged)
                throw new InsertionFailure()

            return tokens
        }
    }

    async retrieveAccessToken(refreshToken: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                let userId: string | undefined = undefined
                try {
                    let payload = await this.verify(refreshToken)

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
                if (!doc) {
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

    async revokeRefreshTokenByUserId(userId: string) {
        let r = await (await db.getRefreshTokensCollection()).deleteMany({ userId })

        if (!r.acknowledged)
            throw new DeletionFailure()
    }

    async revokeRefreshToken(refreshToken: string) {
        let r = await (await db.getRefreshTokensCollection()).deleteMany({ refreshToken })

        if (!r.acknowledged)
            throw new DeletionFailure()
    }

    verify(token: string): Promise<Jwt.JwtPayload | undefined> {
        return new Promise<Jwt.JwtPayload | undefined>((resolve, reject) => {
            Jwt.verify(token, this.jwtSecret, { complete: true, issuer: this.issuer, algorithms: [this.algorithm] }, (e, token) => {
                if (e) {
                    console.error(e)
                    resolve(undefined)
                } else if (typeof token?.payload === 'string') {
                    console.error('invalid token payload type was returned: ' + token?.payload)
                    resolve(undefined)
                } else
                    resolve(token?.payload)
            })
        })
    }
}
