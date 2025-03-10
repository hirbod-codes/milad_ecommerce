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
}
