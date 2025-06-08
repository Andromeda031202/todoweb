using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace TodoApp.Api.Models
{
    public class TaskItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = "Pending";

        public string ProjectId { get; set; } = string.Empty;

        
        public List<string> AssignedUsers { get; set; } = new List<string>();

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        
        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        
        [BsonIgnoreIfNull]
        public string? Title { get; set; }

        [BsonIgnoreIfNull]
        public string? AssignedTo { get; set; }

        [BsonIgnoreIfNull]
        public string? AssignedUser { get; set; }

        [BsonIgnoreIfNull]
        public string? AssignedUserId { get; set; }

        [BsonIgnoreIfNull]
        public List<string>? AssignedUserNames { get; set; }

        [BsonIgnoreIfNull]
        public DateTime? DueDate { get; set; }

        public TaskItem()
        {
            AssignedUsers = new List<string>();
            StartDate = DateTime.UtcNow;
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        public void SyncFields()
        {
            if (string.IsNullOrEmpty(Name) && !string.IsNullOrEmpty(Title))
                Name = Title;
            else if (string.IsNullOrEmpty(Title) && !string.IsNullOrEmpty(Name))
                Title = Name;

            if (EndDate == null && DueDate != null)
                EndDate = DueDate;
            else if (DueDate == null && EndDate != null)
                DueDate = EndDate;

            if (!string.IsNullOrEmpty(AssignedTo) && !AssignedUsers.Contains(AssignedTo))
            {
                AssignedUsers.Add(AssignedTo);
            }

            if (AssignedUsers.Count > 0 && string.IsNullOrEmpty(AssignedTo))
            {
                AssignedTo = AssignedUsers[0];
            }
        }
    }
}
