using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace TodoApp.Api.Models
{
    public class Project
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("description")]
        public string Description { get; set; } = string.Empty;

        [BsonElement("assignedUsers")]
        public List<string> AssignedUsers { get; set; } = new List<string>();

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("deadline")]
        public DateTime? Deadline { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "Not Started";

        [BsonElement("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
    }
}
