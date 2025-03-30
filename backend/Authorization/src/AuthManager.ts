import Jwt from 'jsonwebtoken'
import type { StringValue } from "ms";
import { accessTokenExpiresIn, jwtSecret, refreshTokenExpiresIn } from '.';
import { DeletionFailure } from './DB/Exceptions/DeletionFailure';
import { DateTime } from 'luxon';
import { InsertionFailure } from './DB/Exceptions/InsertionFailure';
import { RevokedAccessTokenManager } from './RevokedAccessTokens/RevokedAccessTokenManager';
import { privilegeNames } from "@/src/DB/Models/privilegeNames"
import { ObjectId } from 'mongodb';
import { RefreshToken } from './DB/Models/RefreshToken';
import { MongoDB } from './DB/mongodb';

export class AuthManager {
    static getInstance() {
        return new AuthManager()
    }

    static PRIVILEGE_NAMES: string[] = privilegeNames

    private jwtSecret: string
    private algorithm: Jwt.Algorithm
    private accessTokenExpiresIn: number | StringValue
    private refreshTokenExpiresIn: number | StringValue
    private issuer: string = 'Authorization Server'

    constructor() {
        this.jwtSecret = jwtSecret
        this.algorithm = 'HS512'
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
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        const accessToken = await this.generateAccessToken(userId, role)

        let doc = await (await MongoDB.getDbInstance().getRefreshTokensCollection()).findOneAndUpdate({ userId }, { $set: { accessToken } })

        if (doc) {
            let payload = Jwt.decode(doc.accessToken, { json: true })
            if (payload && payload?.exp !== undefined && DateTime.utc().toUnixInteger() < payload.exp)
                await RevokedAccessTokenManager.set(doc.accessToken, 'true', payload.exp)

            return {
                refreshToken: doc.refreshToken,
                accessToken,
            }
        }

        const refreshToken = await this.generateRefreshToken(userId, role)

        let createResult = await (await MongoDB.getDbInstance().getRefreshTokensCollection()).insertOne({
            userId: userId,
            refreshToken,
            accessToken,
            expiresAt: DateTime.utc().plus({ seconds: refreshTokenExpiresIn }).toUnixInteger(),
            createdAt: DateTime.utc().toUnixInteger(),
        })
        console.log('createResult', createResult)

        if (!createResult.acknowledged)
            throw new InsertionFailure()

        return {
            refreshToken,
            accessToken,
        }
    }

    async retrieveAccessToken(refreshToken: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                let userId: string | ObjectId = undefined!
                let role: string = undefined!
                try {
                    let payload = await this.verify(refreshToken, 'refreshToken')

                    if (payload === undefined)
                        throw new Error('Invalid refresh token')

                    if (!payload?.sub)
                        throw new Error('no userId')

                    if (!payload?.role)
                        throw new Error('no role')


                    userId = payload?.sub
                    role = payload?.role
                }
                catch (e) { reject(e); return }

                if (typeof userId === 'string')
                    userId = ObjectId.createFromHexString(userId)

                const accessToken = await this.generateAccessToken(userId, role)

                let doc = await (await MongoDB.getDbInstance().getRefreshTokensCollection()).findOneAndUpdate({ userId }, { $set: { accessToken } })
                if (!doc)
                    throw new Error('Refresh token not found in db')

                let payload = Jwt.decode(doc.accessToken, { json: true })
                if (payload && payload?.exp !== undefined && DateTime.utc().toUnixInteger() < payload.exp)
                    await RevokedAccessTokenManager.set(doc.accessToken, 'true', payload.exp)

                resolve(accessToken)
            } catch (e) {
                console.error(e)
                reject(e)
            }
        });
    }

    async revokeRefreshTokenByUserId(userId: string | ObjectId): Promise<boolean> {
        let refreshToken = await (await MongoDB.getDbInstance().getRefreshTokensCollection()).findOne({ userId: typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId })
        if (!refreshToken)
            return false

        return await this.revokeRefreshToken(refreshToken)
    }

    async revokeRefreshToken(refreshToken: string | RefreshToken): Promise<boolean> {
        if (typeof refreshToken === 'string') {
            let t = await (await MongoDB.getDbInstance().getRefreshTokensCollection()).findOne({ refreshToken })
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

        let r = await (await MongoDB.getDbInstance().getRefreshTokensCollection()).deleteMany({ refreshToken: refreshToken.refreshToken })

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
