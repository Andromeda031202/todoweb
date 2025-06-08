namespace TodoApp.Api.Configuration
{
    public class JwtConfig
    {
        public string SecretKey { get; set; } = string.Empty;
        public string Issuer { get; set; } = "TodoApp";
        public string Audience { get; set; } = "TodoApp";
        public int ExpiryInMinutes { get; set; } = 60;
    }
}
