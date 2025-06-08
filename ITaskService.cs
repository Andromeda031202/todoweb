using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.Models;
using TodoApp.Api.DTOs;

namespace TodoApp.Api.Services
{
    public interface ITaskService
    {
        Task<List<TaskItem>> GetAllAsync();
        Task<TaskItem?> GetByIdAsync(string id);
        Task<List<TaskItem>> GetByProjectIdAsync(string projectId);
        Task<List<TaskItem>> GetByUserIdAsync(string userId);
        Task<TaskItem> CreateAsync(TaskItem task);
        Task<TaskItem?> UpdateAsync(string id, TaskItem taskIn);
        Task<bool> DeleteAsync(string id);
        Task<(List<TaskItem> Tasks, long TotalCount)> GetTasksAsync(TaskQueryDto queryParameters); // Changed parameter type
        Task RemoveByProjectIdAsync(string projectId);
        Task<bool> InitializeCollection();
    }
}