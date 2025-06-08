using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories
{
    public interface IProjectRepository
    {
        Task<PagedResultDTO<Project>> GetAllAsync(ProjectFilterDTO filter);
        Task<List<Project>> GetAllAsync();
        Task<Project?> GetByIdAsync(string id);
        Task<Project> CreateAsync(Project project);
        Task<Project?> UpdateAsync(string id, Project project);
        Task<bool> DeleteAsync(string id);
    }
}