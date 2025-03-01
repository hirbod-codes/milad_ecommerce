import { Config } from "../Contexts/Configuration";

export interface IStorage {
    getConfig(): Promise<Config | undefined>
    setConfig(config: Config): Promise<void>
}
