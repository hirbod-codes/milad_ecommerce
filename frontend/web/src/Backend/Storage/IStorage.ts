import { Config } from "@/src/Contexts/Configuration"

export interface IStorage {
    getConfig(): Promise<Config | undefined>
    setConfig(config: Config): Promise<void>
    getTokens(): Promise<{ accessToken: string, refreshToken: string } | undefined>
    setTokens(tokens: { accessToken: string, refreshToken: string }): Promise<void>
    unsetTokens(): Promise<void>
}
