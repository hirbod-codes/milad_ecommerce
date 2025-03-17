import Jwt from 'jsonwebtoken'
import type { StringValue } from "ms";
import { db, refreshTokenExpiresIn } from '.';
import { DeletionFailure } from './DB/Exceptions/DeletionFailure';
import { DateTime } from 'luxon';
import { InsertionFailure } from './DB/Exceptions/InsertionFailure';

export class AuthManager {
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
                createdAt: DateTime.utc().toUnixInteger(),
                expiresAt: DateTime.utc().plus({ seconds: refreshTokenExpiresIn }).toUnixInteger()
            })

            if (!r.acknowledged)
                throw new InsertionFailure()

            return tokens
        }
    }

    async retrieveAccessToken(userId: string, refreshToken: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                try { Jwt.verify(refreshToken, this.jwtSecret, { issuer: this.issuer, algorithms: [this.algorithm] }) }
                catch (e) { reject(e); return }

                let doc = (await (await db.getRefreshTokensCollection()).findOne({ refreshToken }))

                if (!doc || doc.userId.toString() !== userId) {
                    reject()
                    return
                }

                try { Jwt.verify(doc!.refreshToken, this.jwtSecret, { issuer: this.issuer, algorithms: [this.algorithm] }) }
                catch (e) { reject(e); return }

                resolve(await this.generateAccessToken(userId, doc.role))
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
}
