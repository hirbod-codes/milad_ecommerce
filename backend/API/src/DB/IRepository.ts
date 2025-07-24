import { ClientSession, Db } from "mongodb";

export interface IRepository {
    setTransactionSession(session?: ClientSession): void;
    unsetTransactionSession(): void;
    seed(count?: number): Promise<void>;
    addCollection(db: Db): Promise<void>;
    dropCollection(db: Db): Promise<void>;
}
