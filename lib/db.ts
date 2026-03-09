import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

class DatabaseConnection {
  private pool: Pool | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<boolean> {
    if (this.isConnected && this.pool) {
      return true;
    }

    try {
      const poolConfig = process.env.DATABASE_PUBLIC_URL
        ? {
            connectionString: process.env.DATABASE_PUBLIC_URL,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          }
        : {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'quattrak',
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT || '5432'),
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          };

      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('[DB] Connected to PostgreSQL');
      return true;
    } catch (error) {
      console.error('[DB] Failed to connect:', (error as Error).message);
      this.isConnected = false;
      return false;
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    if (!this.isConnected || !this.pool) {
      await this.connect();
    }

    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    const result = await this.pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (duration > 100) {
      console.log('[DB] Slow query:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
  }

  async getClient(): Promise<PoolClient> {
    if (!this.isConnected || !this.pool) {
      await this.connect();
    }

    if (!this.pool) {
      throw new Error('Database not connected');
    }

    return this.pool.connect();
  }

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('[DB] Connection closed');
    }
  }
}

const db = new DatabaseConnection();
export default db;
