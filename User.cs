using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]  
    public string Id { get; set; } = null!;    

    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = "user";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
   
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastEditedByAdmin { get; set; } = null;
    public List<string> Projects { get; set; } = new();
    public List<string> Tasks { get; set; } = new();
}
