export class EnvManager {
    static getEnv(name: string) {
        if ((window as any)?.env && (window as any)?.env[name])
            return (window as any)?.env[name]
        else
            return import.meta.env[name]
    }
}
