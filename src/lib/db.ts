    // src/lib/db.ts
    import { Pool } from 'pg';

    // Initialize pool to undefined
    let pool: Pool | undefined = undefined;

    // Ensure the pool is created only once (singleton pattern)
    if (!pool) {
      console.log('Creating new PostgreSQL connection pool...');
      pool = new Pool({
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10), // Default to 5432 if not set
        database: process.env.POSTGRES_DATABASE,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        // Optional: Configure connection pool options if needed
        // max: 20, // Example: max number of clients in the pool
        // idleTimeoutMillis: 30000, // Example: how long a client is allowed to remain idle before being closed
        // connectionTimeoutMillis: 2000, // Example: how long to wait for a connection if all clients are busy
      });

      // Optional: Add an event listener for errors on idle clients
      pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
        // You might want to decide whether to exit the process based on the error
        // process.exit(-1);
      });

      console.log('PostgreSQL connection pool created.');

    } else {
        console.log('Reusing existing PostgreSQL connection pool.');
    }


    // Export the configured pool
    // Add a non-null assertion because we ensure it's created
    export default pool!;

    // Optional: A quick function to test the connection during startup
    export async function testDbConnection() {
        let client;
        try {
            // Use the exported pool
            client = await pool!.connect();
            const res = await client.query('SELECT NOW()');
            console.log('Database connection test successful:', res.rows[0]);
        } catch (error) {
            console.error('Database connection test failed:', error);
        } finally {
            // Make sure to release the client even if there is an error
            if (client) {
                client.release();
            }
        }
    }