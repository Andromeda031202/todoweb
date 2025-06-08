using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.DTOs
{
    public class TaskDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string ProjectId { get; set; } = string.Empty;
        public string ProjectName { get; set; } = string.Empty;
        public List<string> AssignedUsers { get; set; } = new List<string>();
        public List<string> AssignedUserNames { get; set; } = new List<string>();
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class TaskCreateDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = "Pending";

        [Required]
        public string ProjectId { get; set; } = string.Empty;

        public List<string> AssignedUsers { get; set; } = new List<string>();
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class TaskUpdateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public List<string> AssignedUsers { get; set; } = new List<string>();
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class TaskQueryDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Page must be at least 1")]
        public int Page { get; set; } = 1;

        [Range(1, 100, ErrorMessage = "PageSize must be between 1 and 100")]
        public int PageSize { get; set; } = 10;

        public string? Search { get; set; }
        public string? Status { get; set; }
        public string? ProjectId { get; set; }
        public string? SortBy { get; set; } = "CreatedAt";
        public string? SortOrder { get; set; } = "desc"; 
        public DateTime? CreatedAfter { get; set; }
        public DateTime? CreatedBefore { get; set; }
        public DateTime? UpdatedAfter { get; set; }
        public DateTime? UpdatedBefore { get; set; }
    }

    public class PagedTaskResult
    {
        public List<TaskDTO> Tasks { get; set; } = new List<TaskDTO>();
        public int TotalTasks { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }
}
