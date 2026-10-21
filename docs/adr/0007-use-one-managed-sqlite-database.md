# Keep managed application data in one SQLite database

Lumina stores installed Bible content and indexes, translation and edition identities, persistent workspace state, and history in one application-managed SQLite database. This keeps related durable changes within one transactional store, accepting shared writer capacity instead of coordinating separate content and application databases. Imports are validated and staged before publication without modifying supplied files; live-import responsiveness must be verified, and the schema, migration, and staging contracts remain engineering work.
