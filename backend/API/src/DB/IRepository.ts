import { ClientSession, Db } from "mongodb";

export interface IRepository {
    setTransactionSession(session?: ClientSession): void;
    unsetTransactionSession(): void;
    addCollection(db: Db): Promise<void>;
    dropCollection(db: Db): Promise<void>;

    /**
     * calling this method multiple times does not add to the number of documents in the collection (use count parameter instead).
     * @param count number of documents in the collection after seed operation.
     */
    seed(count?: number): Promise<void>;
}
