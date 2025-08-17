import * as schema from './schema';
export declare function createDatabase(connectionString: string): import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export declare function createDatabaseFromEnv(): import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export type Database = ReturnType<typeof createDatabase>;
//# sourceMappingURL=connection.d.ts.map