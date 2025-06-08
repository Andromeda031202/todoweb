using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.Models;
using TodoApp.Api.DTOs;

namespace TodoApp.Api.Repositories
{
    public interface ITaskRepository
    {
        Task<List<TaskItem>> GetAllAsync();
        Task<TaskItem?> GetByIdAsync(string id);
        Task<IEnumerable<TaskItem>> GetTasksByUserIdAsync(string userId);
        Task<IEnumerable<TaskItem>> GetTasksByProjectIdAsync(string projectId);
        Task<TaskItem> CreateAsync(TaskItem taskItem);
        Task<TaskItem?> UpdateAsync(string id, TaskItem taskIn);
        Task<bool> DeleteAsync(string id);
        Task DeleteByProjectIdAsync(string projectId); // Changed return type to Task instead of Task<bool>
        Task<(List<TaskItem> Tasks, long TotalCount)> GetTasksAsync(TaskQueryDto queryParameters); // Changed parameter type
        Task<PagedTaskResult> GetPagedFilteredAsync(TaskQueryDto query);
    }
}