import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

/**
 * PostgreSQL DAO Class
 * Provides database operations with connection pooling
 */
class PostgresDAO {
  constructor(dbConfig) {
    this.pool = new Pool(dbConfig);
    this.isConnected = false;
    
    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client:', err);
    });

    // Handle pool connection events
    this.pool.on('connect', () => {
      console.log('New client connected to PostgreSQL database');
    });

    this.pool.on('remove', () => {
      console.log('Client removed from PostgreSQL pool');
    });
  }

  /**
   * Initialize database connection and test connectivity
   */
  async initialize() {
    try {
      // Test the connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      console.log('✅ Database connected successfully');
      console.log(`📅 Server time: ${result.rows[0].current_time}`);
      console.log(`🗄️  PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
      
      client.release();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Execute a raw SQL query with parameters
   * @param {string} text - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Object} Query result
   */
  async runQuery(text, params = []) {
    const client = await this.pool.connect();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      console.log(`🔍 Query executed in ${duration}ms:`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      return result;
    } catch (error) {
      console.error('❌ Query execution error:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all rows from a table with optional conditions
   * @param {string} tableName - Name of the table
   * @param {Object} options - Query options
   * @param {Object} options.where - Where conditions
   * @param {string} options.orderBy - Order by clause
   * @param {number} options.limit - Limit number of results
   * @param {number} options.offset - Offset for pagination
   * @param {Array} options.select - Specific columns to select
   * @returns {Array} Array of rows
   */
  async getAllRows(tableName, options = {}) {
    const { where = {}, orderBy, limit, offset, select = ['*'] } = options;
    
    let query = `SELECT ${select.join(', ')} FROM ${tableName}`;
    const params = [];
    let paramIndex = 1;

    // Add WHERE clause
    if (Object.keys(where).length > 0) {
      const whereConditions = Object.keys(where).map(key => {
        params.push(where[key]);
        return `${key} = $${paramIndex++}`;
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    // Add LIMIT
    if (limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(limit);
    }

    // Add OFFSET
    if (offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(offset);
    }

    const result = await this.runQuery(query, params);
    return result.rows;
  }

  /**
   * Get a single row from a table
   * @param {string} tableName - Name of the table
   * @param {Object} where - Where conditions
   * @param {Array} select - Specific columns to select
   * @returns {Object|null} Single row or null if not found
   */
  async getSingleRow(tableName, where = {}, select = ['*']) {
    const rows = await this.getAllRows(tableName, { where, select, limit: 1 });
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Insert a single row into a table
   * @param {string} tableName - Name of the table
   * @param {Object} data - Data to insert
   * @param {Array} returning - Columns to return
   * @returns {Object} Inserted row
   */
  async insertRow(tableName, data, returning = ['*']) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${returning.join(', ')}
    `;

    const result = await this.runQuery(query, values);
    return result.rows[0];
  }

  /**
   * Insert multiple rows into a table
   * @param {string} tableName - Name of the table
   * @param {Array} dataArray - Array of data objects to insert
   * @param {Array} returning - Columns to return
   * @returns {Array} Array of inserted rows
   */
  async multiInsert(tableName, dataArray, returning = ['*']) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('Data array must be a non-empty array');
    }

    const keys = Object.keys(dataArray[0]);
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    // Build placeholders and collect all values
    dataArray.forEach((data) => {
      const rowPlaceholders = keys.map(() => `$${paramIndex++}`);
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      keys.forEach(key => values.push(data[key]));
    });

    const query = `
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES ${placeholders.join(', ')}
      RETURNING ${returning.join(', ')}
    `;

    const result = await this.runQuery(query, values);
    return result.rows;
  }

  /**
   * Update rows in a table
   * @param {string} tableName - Name of the table
   * @param {Object} data - Data to update
   * @param {Object} where - Where conditions
   * @param {Array} returning - Columns to return
   * @returns {Array} Array of updated rows
   */
  async updateRows(tableName, data, where = {}, returning = ['*']) {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    let paramIndex = 1;

    // Build SET clause
    const setClause = dataKeys.map(key => `${key} = $${paramIndex++}`).join(', ');
    
    let query = `UPDATE ${tableName} SET ${setClause}`;
    const params = [...dataValues];

    // Add WHERE clause
    if (Object.keys(where).length > 0) {
      const whereConditions = Object.keys(where).map(key => {
        params.push(where[key]);
        return `${key} = $${paramIndex++}`;
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ` RETURNING ${returning.join(', ')}`;

    const result = await this.runQuery(query, params);
    return result.rows;
  }

  /**
   * Update multiple rows with different data
   * @param {string} tableName - Name of the table
   * @param {Array} updateArray - Array of objects with data and where conditions
   * @param {Array} returning - Columns to return
   * @returns {Array} Array of all updated rows
   */
  async multiUpdate(tableName, updateArray, returning = ['*']) {
    if (!Array.isArray(updateArray) || updateArray.length === 0) {
      throw new Error('Update array must be a non-empty array');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];

      for (const updateItem of updateArray) {
        const { data, where } = updateItem;
        const updatedRows = await this.updateRows(tableName, data, where, returning);
        results.push(...updatedRows);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete rows from a table
   * @param {string} tableName - Name of the table
   * @param {Object} where - Where conditions
   * @param {Array} returning - Columns to return
   * @returns {Array} Array of deleted rows
   */
  async deleteRows(tableName, where = {}, returning = ['*']) {
    if (Object.keys(where).length === 0) {
      throw new Error('DELETE operation requires WHERE conditions for safety');
    }

    let query = `DELETE FROM ${tableName}`;
    const params = [];
    let paramIndex = 1;

    // Add WHERE clause
    const whereConditions = Object.keys(where).map(key => {
      params.push(where[key]);
      return `${key} = $${paramIndex++}`;
    });
    query += ` WHERE ${whereConditions.join(' AND ')}`;
    query += ` RETURNING ${returning.join(', ')}`;

    const result = await this.runQuery(query, params);
    return result.rows;
  }

  /**
   * Execute a transaction with multiple operations
   * @param {Function} operations - Async function containing operations
   * @returns {any} Result from operations function
   */
  async transaction(operations) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operations(this);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a table exists
   * @param {string} tableName - Name of the table
   * @returns {boolean} True if table exists
   */
  async tableExists(tableName) {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `;
    const result = await this.runQuery(query, [tableName]);
    return result.rows[0].exists;
  }

  /**
   * Get table schema information
   * @param {string} tableName - Name of the table
   * @returns {Array} Array of column information
   */
  async getTableSchema(tableName) {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `;
    const result = await this.runQuery(query, [tableName]);
    return result.rows;
  }

  /**
   * Get connection pool status
   * @returns {Object} Pool status information
   */
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected
    };
  }

  /**
   * Close all connections in the pool
   */
  async close() {
    try {
      await this.pool.end();
      console.log('🔒 Database connections closed');
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Error closing database connections:', error.message);
      throw error;
    }
  }
}

// Create and initialize the default DAO instance
const defaultPgDao = new PostgresDAO(config.database);

// Initialize connection on module load
(async () => {
  try {
    await defaultPgDao.initialize();
  } catch (error) {
    console.error('Failed to initialize database connection:', error.message);
    // Don't exit the process, let the application handle the error
  }
})();

// Export the default instance and the class
export { defaultPgDao, PostgresDAO };
export default defaultPgDao;
