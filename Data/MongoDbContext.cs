using MongoDB.Driver;
using TodoApp.Api.Configuration;
using TodoApp.Api.Models;
using System;

namespace TodoApp.Api.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;
        private const string USER_COLLECTION = "users";
        private const string PROJECT_COLLECTION = "projects";
        private const string TASK_COLLECTION = "tasks";

        public MongoDbContext(MongoDbConfig config)
        {
            if (config == null)
                throw new ArgumentNullException(nameof(config));
            if (string.IsNullOrWhiteSpace(config.ConnectionString))
                throw new ArgumentException("MongoDB connection string is missing");
            if (string.IsNullOrWhiteSpace(config.DatabaseName))
                throw new ArgumentException("MongoDB database name is missing");

            Console.WriteLine($"[MongoDbContext] Initializing connection to MongoDB: {config.ConnectionString}");
            var client = new MongoClient(config.ConnectionString);
            _database = client.GetDatabase(config.DatabaseName);
            Console.WriteLine($"[MongoDbContext] Connected to database: {_database.DatabaseNamespace.DatabaseName}");
            
                        InitializeCollections();
        }

        public IMongoDatabase Database => _database;

                public IMongoCollection<User> Users => _database.GetCollection<User>(USER_COLLECTION);
        public IMongoCollection<Project> Projects => _database.GetCollection<Project>(PROJECT_COLLECTION);
        public IMongoCollection<TaskItem> Tasks => _database.GetCollection<TaskItem>(TASK_COLLECTION);
        
        private void InitializeCollections()
        {
            try
            {
                Console.WriteLine("[MongoDbContext] Initializing collections with standardized names");
                
                                EnsureCollectionExists<User>(USER_COLLECTION, "Users");
                EnsureCollectionExists<Project>(PROJECT_COLLECTION, "Projects");
                EnsureCollectionExists<TaskItem>(TASK_COLLECTION, "tasks");
                
                Console.WriteLine("[MongoDbContext] Collection initialization complete");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MongoDbContext] Error initializing collections: {ex.Message}");
            }
        }
        
        private void EnsureCollectionExists<T>(string standardName, string legacyName)
        {
            try
            {
                                var standardCollectionExists = CollectionExists(standardName);
                var legacyCollectionExists = CollectionExists(legacyName);
                
                Console.WriteLine($"[MongoDbContext] Collection check: {standardName} exists: {standardCollectionExists}, {legacyName} exists: {legacyCollectionExists}");
                
                                if (!standardCollectionExists && legacyCollectionExists && standardName != legacyName)
                {
                    Console.WriteLine($"[MongoDbContext] Renaming collection from {legacyName} to {standardName}");
                    _database.RenameCollection(legacyName, standardName);
                }
                                else if (!standardCollectionExists && !legacyCollectionExists)
                {
                    Console.WriteLine($"[MongoDbContext] Creating new collection: {standardName}");
                    _database.CreateCollection(standardName);
                }
                
                Console.WriteLine($"[MongoDbContext] Ensured collection exists: {standardName}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MongoDbContext] Error ensuring collection {standardName}: {ex.Message}");
            }
        }
        
        public bool CollectionExists(string collectionName)
        {
            try
            {
                var filter = new MongoDB.Bson.BsonDocument("name", collectionName);
                var options = new ListCollectionsOptions { Filter = filter };
                return _database.ListCollections(options).Any();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MongoDbContext] Error checking collection existence: {ex.Message}");
                return false;
            }
        }
    }
}
