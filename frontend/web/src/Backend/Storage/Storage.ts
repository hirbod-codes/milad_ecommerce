import { Config } from "@/src/Contexts/Configuration";
import { IStorage } from "./IStorage";

export class Storage implements IStorage {
    async getConfig(): Promise<Config | undefined> {
        let c = window.localStorage.getItem('config')
        if (!c)
            return undefined

        return JSON.parse(c) as Config
    }

    async setConfig(config: Config): Promise<void> {
        window.localStorage.setItem('config', JSON.stringify(config))
    }

    async getTokens(): Promise<{ accessToken: string, refreshToken: string } | undefined> {
        let refreshToken = window.localStorage.getItem('refreshToken')
        if (!refreshToken)
            return undefined

        let accessToken = window.localStorage.getItem('accessToken')
        if (!accessToken)
            return undefined

        return { accessToken, refreshToken }
    }

    async setTokens(tokens: { accessToken: string, refreshToken: string }): Promise<void> {
        window.localStorage.setItem('accessToken', tokens.accessToken)
        window.localStorage.setItem('refreshToken', tokens.refreshToken)
    }

    async unsetTokens(): Promise<void> {
        window.localStorage.removeItem('accessToken')
        window.localStorage.removeItem('refreshToken')
    }
}
