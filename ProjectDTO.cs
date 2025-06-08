using System;
using System.Collections.Generic;

namespace TodoApp.Api.DTOs
{
    public class ProjectDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> AssignedUsers { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime? Deadline { get; set; }
        public string Status { get; set; } = "Not Started";
        public DateTime? UpdatedAt { get; set; }
    }

    public class ProjectCreateDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> AssignedUsers { get; set; } = new();
        public DateTime? Deadline { get; set; }
        public string Status { get; set; } = "Not Started";
    }

    public class ProjectUpdateDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> AssignedUsers { get; set; } = new();
        public DateTime? Deadline { get; set; }
        public string Status { get; set; } = "Not Started";
    }

    public class ProjectCreateDTO
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> AssignedUsers { get; set; } = new();
        public DateTime? Deadline { get; set; }
        public string Status { get; set; } = "Not Started";
    }

    public class ProjectUpdateDTO
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> AssignedUsers { get; set; } = new();
        public DateTime? Deadline { get; set; }
        public string Status { get; set; } = "Not Started";
    }

    public class ProjectDeleteDto
    {
        public string Id { get; set; } = string.Empty;
    }

    public class ProjectFilterDTO
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? Search { get; set; }
        public string SortBy { get; set; } = "createdAt";
        public string SortOrder { get; set; } = "desc"; 
        public string? Status { get; set; }
        public string? AssignedUser { get; set; }
        public DateTime? CreatedFrom { get; set; }
        public DateTime? CreatedTo { get; set; }
        public DateTime? DeadlineFrom { get; set; }
        public DateTime? DeadlineTo { get; set; }
    }

    public class PagedResultDTO<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasPreviousPage => Page > 1;
        public bool HasNextPage => Page < TotalPages;
    }
}