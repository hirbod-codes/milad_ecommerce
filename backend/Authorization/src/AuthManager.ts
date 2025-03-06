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

    async generateToken(username: string, expiresIn: number | StringValue): Promise<string> {
        return new Promise<string>((resolve) => {
            let t = Jwt.sign({ username }, this.jwtSecret, { issuer: this.issuer, expiresIn, algorithm: this.algorithm });
            resolve(t)
        })
    }

    async generateAccessToken(username: string): Promise<string> {
        return await this.generateToken(username, this.accessTokenExpiresIn)
    }

    async generateRefreshToken(username: string): Promise<string> {
        return await this.generateToken(username, this.refreshTokenExpiresIn)
    }

    async generateTokens(username: string): Promise<{
        accessToken: string,
        refreshToken: string,
    }> {
        let refreshTokenDoc = await (await db.getRefreshTokensCollection()).findOne({ username })

        if (refreshTokenDoc)
            return {
                accessToken: await this.generateAccessToken(username),
                refreshToken: refreshTokenDoc.refreshToken,
            }
        else {
            let tokens = {
                accessToken: await this.generateAccessToken(username),
                refreshToken: await this.generateRefreshToken(username),
            }

            let r = await (await db.getRefreshTokensCollection()).insertOne({
                username,
                refreshToken: tokens.refreshToken,
                createdAt: DateTime.utc().toUnixInteger(),
                expiresAt: DateTime.utc().plus({ seconds: refreshTokenExpiresIn }).toUnixInteger()
            })

            if (!r.acknowledged)
                throw new InsertionFailure()

            return tokens
        }
    }

    async retrieveAccessToken(username: string, refreshToken: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                try { Jwt.verify(refreshToken, this.jwtSecret, { issuer: this.issuer, algorithms: [this.algorithm] }) }
                catch (e) { reject(e) }

                let doc = (await (await db.getRefreshTokensCollection()).findOne({ refreshToken }))

                if (!doc || doc.username !== username) {
                    reject()
                    return
                }

                try { Jwt.verify(doc!.refreshToken, this.jwtSecret, { issuer: this.issuer, algorithms: [this.algorithm] }) }
                catch (e) { reject(e); return }

                resolve(await this.generateAccessToken(username))
            } catch (e) {
                reject(e)
            }
        });
    }

    async revokeRefreshTokenByUsername(username: string) {
        let r = await (await db.getRefreshTokensCollection()).deleteMany({ username })

        if (!r.acknowledged)
            throw new DeletionFailure()
    }

    async revokeRefreshToken(refreshToken: string) {
        let r = await (await db.getRefreshTokensCollection()).deleteMany({ refreshToken })

        if (!r.acknowledged)
            throw new DeletionFailure()
    }
}
