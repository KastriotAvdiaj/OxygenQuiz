# How to execute into each database (postgres or mongodb) to verify the existance of data

POSTGRESS commands once executed into:

1. "\l" - List all databases,
2. "\c {databasename}" - Connect or switch to a specific database,
3. "\dt" - List all tables in the current database,
4. "\q" - Exist the postgress prompt. 


# POSTGRES via Docker

1. Go to "Exec" tab in the interface,
2. type : "psql -U postgres",


# POSTGRES via CMD

1. Open CMD,
2. type: "docker exec -it postgres-db psql -U postgres"


> **Note:** MongoDB is currently **disabled** — the app no longer runs a Mongo container, so the
> commands below don't apply until the persistent chat system is re-enabled. See
> [`mongodb.md`](./mongodb.md).

MONGODB commands once executed into:
1. show dbs - List all available databases.
2. use {databasename} - Connect or switch to a specific database.
3. show collections - List all collections (tables) in the current database.
4. db.{collectionname}.find().pretty() - View documents (rows) inside a specific collection.
5. exit - Exit the mongo prompt.

# MONGODB via Docker
1. Go to Exec tab in the interface.
2. Type: mongosh (Note: Use mongo if running an older container version).

# MONGODB via CMD
Open CMD.

Type: docker exec -it mongo-db mongosh (Note: Use mongo at the end if running an older container version).