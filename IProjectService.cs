using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;

namespace TodoApp.Api.Services
{
    public interface IProjectService
    {
        Task<PagedResultDTO<ProjectDTO>> GetAllAsync(ProjectFilterDTO filter);
        Task<List<Project>> GetAllAsync();
        Task<Project?> GetByIdAsync(string id);
        Task<Project> CreateAsync(Project project);
        Task<Project?> UpdateAsync(string id, Project project);
        Task<ProjectDTO> CreateAsync(ProjectCreateDto dto);
        Task<ProjectDTO?> UpdateAsync(string id, ProjectUpdateDto dto);
        Task<bool> DeleteAsync(string id);
    }
}