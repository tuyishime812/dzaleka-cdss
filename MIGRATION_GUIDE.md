# Migration Guide: From SQLite to Supabase

This guide explains how to migrate your existing school portal application from SQLite to Supabase.

## Why Migrate to Supabase?

- **Scalability**: PostgreSQL scales better than SQLite for multiple concurrent users
- **Authentication**: Built-in user authentication and management
- **Real-time**: Real-time data synchronization capabilities
- **Dashboard**: Web-based interface for data management
- **Security**: Enhanced security features and best practices
- **Reliability**: Production-ready database with backups

## Migration Steps

### 1. Export Existing Data (Optional)
If you want to preserve existing data:

```bash
# Backup the SQLite database
cp database.db database_backup.db
```

### 2. Set Up Supabase
Follow the instructions in [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to create a Supabase project.

### 3. Update Configuration
Update your `.env` file with Supabase credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Update Package Dependencies
The new server uses Supabase client instead of SQLite:
- Removed: `sqlite3` dependency
- Added: `@supabase/supabase-js` dependency

### 5. Update Database Schema
Run the schema from `supabase_schema.sql` in your Supabase SQL editor.

### 6. Update Application Code
The new server (`supabase_server.js`) handles all database operations through Supabase API.

## Key Differences

| Feature | Old (SQLite) | New (Supabase) |
|---------|--------------|----------------|
| Database | Local SQLite file | Cloud PostgreSQL |
| Authentication | Custom JWT | Supabase Auth |
| Data Management | Code-based | Dashboard-based |
| Scaling | Limited | Highly scalable |
| Real-time | Manual refresh | Built-in support |

## Running the Migrated Application

```bash
# Install dependencies
npm install

# Start the application
npm start
```

## Rollback Option

If you need to rollback to the SQLite version:

1. Stop the current server
2. Change the start script in `package.json` back to the old server
3. Restore your `.env` file to the original state
4. Run `npm install` to reinstall old dependencies
5. Start the application

## Support

For any issues during migration, please refer to the documentation or contact support.