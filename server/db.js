// The ONLY file that talks to the Azure SQL database.
// Every query uses parameters (@name), never string-joined user input.
import sql from 'mssql';

// The table is created by hand in Azure SQL (see README). This name is fixed
// by the database, so it is the one place the word "todo" may appear in code.
export const USERS_TABLE = 'dbo.demo_todolist_manvitha';

// SQL Server error numbers for "duplicate key" (unique constraint / unique index).
const DUPLICATE_KEY_ERRORS = new Set([2627, 2601]);

function toRecord(row) {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    name: row.name,
    email: row.email,
  };
}

// Returns the user store used by server/app.js. The connection pool is opened
// on first use; if connecting fails, the next request tries again.
export function createUserStore(connectionString) {
  let poolPromise = null;

  function getPool() {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(connectionString).connect().catch((err) => {
        poolPromise = null;
        throw err;
      });
    }
    return poolPromise;
  }

  return {
    async findByUsername(username) {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('username', sql.NVarChar(50), username)
        .query(
          `SELECT TOP 1 id, username, password_hash, name, email FROM ${USERS_TABLE} WHERE username = @username`,
        );
      const row = result.recordset[0];
      return row ? toRecord(row) : null;
    },

    // Which of username / email is already used by another account?
    async findConflicts(username, email) {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('username', sql.NVarChar(50), username)
        .input('email', sql.NVarChar(254), email)
        .query(
          `SELECT username, email FROM ${USERS_TABLE} WHERE username = @username OR email = @email`,
        );
      const rows = result.recordset;
      return {
        usernameTaken: rows.some((r) => r.username.toLowerCase() === username.toLowerCase()),
        emailTaken: rows.some((r) => r.email.toLowerCase() === email.toLowerCase()),
      };
    },

    async create({ username, passwordHash, name, email }) {
      const pool = await getPool();
      try {
        const result = await pool
          .request()
          .input('username', sql.NVarChar(50), username)
          .input('passwordHash', sql.NVarChar(100), passwordHash)
          .input('name', sql.NVarChar(100), name)
          .input('email', sql.NVarChar(254), email)
          .query(
            `INSERT INTO ${USERS_TABLE} (username, password_hash, name, email)
             OUTPUT INSERTED.id
             VALUES (@username, @passwordHash, @name, @email)`,
          );
        return { id: result.recordset[0].id, username, passwordHash, name, email };
      } catch (err) {
        // Two sign-ups racing for the same username/email: the unique
        // constraint on the table is the final guard.
        if (DUPLICATE_KEY_ERRORS.has(err.number)) {
          const duplicate = new Error('Username or email already exists');
          duplicate.code = 'DUPLICATE';
          throw duplicate;
        }
        throw err;
      }
    },
  };
}
