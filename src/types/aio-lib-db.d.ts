declare module '@adobe/aio-lib-db' {
  export type DbRegion = 'amer' | 'apac' | 'emea' | 'aus';
  export type DbDocument = Record<string, unknown>;
  export type DbOptions = Record<string, unknown>;
  export interface DbCursor extends AsyncIterable<DbDocument> {
    filter(filter: DbDocument): this;
    sort(sort: string | string[] | DbDocument | number, direction?: string | DbDocument | number): this;
    project(projection: Record<string, 0 | 1>): this;
    limit(limit: number): this;
    skip(skip: number): this;
    batchSize(size: number): this;
    hasNext(): Promise<boolean>;
    next(): Promise<DbDocument | null>;
    toArray(): Promise<DbDocument[]>;
    close(): Promise<void>;
  }
  export interface DbCollection {
    insertOne(document: DbDocument, options?: DbOptions): Promise<unknown>;
    insertMany(documents: DbDocument[], options?: DbOptions): Promise<unknown>;
    findOne(filter: DbDocument, options?: DbOptions): Promise<DbDocument>;
    find(filter?: DbDocument, options?: DbOptions): DbCursor;
    updateOne(filter: DbDocument, update: DbDocument, options?: DbOptions): Promise<unknown>;
    updateMany(filter: DbDocument, update: DbDocument, options?: DbOptions): Promise<unknown>;
    findOneAndUpdate(filter: DbDocument, update: DbDocument, options?: DbOptions & { returnDocument?: 'before' | 'after' }): Promise<unknown>;
    deleteOne(filter: DbDocument, options?: DbOptions): Promise<unknown>;
    deleteMany(filter: DbDocument, options?: DbOptions): Promise<unknown>;
    createIndex(specification: Record<string, 1 | -1>, options?: DbOptions & { unique?: boolean }): Promise<unknown>;
    countDocuments(filter?: DbDocument, options?: DbOptions): Promise<number>;
    drop(options?: DbOptions): Promise<void>;
  }
  export interface DbClient {
    collection(name: string): DbCollection;
    listCollections(filter?: DbDocument, options?: DbOptions): Promise<DbDocument[]>;
    createCollection(name: string, options?: DbOptions): Promise<DbCollection>;
    close(): Promise<void>;
  }
  export interface DbBase { connect(): Promise<DbClient>; }
  export function init(config: { token: string; region?: DbRegion; ow?: { namespace?: string } }): Promise<DbBase>;
}
