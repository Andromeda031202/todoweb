using Microsoft.Extensions.Configuration;

namespace TodoApp.Api.Configuration
{
    public class MongoDbConfig
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;

        public MongoDbConfig(IConfiguration configuration)
        {
            ConnectionString = configuration.GetValue<string>("MongoDbConfig:ConnectionString") ?? throw new ArgumentNullException("ConnectionString is missing in configuration");
            DatabaseName = configuration.GetValue<string>("MongoDbConfig:DatabaseName") ?? throw new ArgumentNullException("DatabaseName is missing in configuration");
        }
    }
}
