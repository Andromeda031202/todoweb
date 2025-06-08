using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Repositories;

namespace TodoApp.Api.Services
{
    public class ProjectService : IProjectService
    {
        private readonly IProjectRepository _projectRepository;

        public ProjectService(IProjectRepository projectRepository)
        {
            _projectRepository = projectRepository ?? throw new ArgumentNullException(nameof(projectRepository));
        }

        public async Task<PagedResultDTO<ProjectDTO>> GetAllAsync(ProjectFilterDTO filter)
        {
            var pagedProjects = await _projectRepository.GetAllAsync(filter);

            var dtoList = pagedProjects.Items.ConvertAll(ToProjectDTO);

            return new PagedResultDTO<ProjectDTO>
            {
                Items = dtoList,
                TotalCount = pagedProjects.TotalCount,
                Page = pagedProjects.Page,
                PageSize = pagedProjects.PageSize
            };
        }

        public async Task<List<Project>> GetAllAsync()
        {
            return await _projectRepository.GetAllAsync();
        }

        public async Task<Project?> GetByIdAsync(string id)
        {
            return await _projectRepository.GetByIdAsync(id);
        }

        public async Task<Project> CreateAsync(Project project)
        {
            return await _projectRepository.CreateAsync(project);
        }

        public async Task<Project?> UpdateAsync(string id, Project project)
        {
            return await _projectRepository.UpdateAsync(id, project);
        }

        public async Task<ProjectDTO> CreateAsync(ProjectCreateDto dto)
        {
            var project = new Project
            {
                Id = ObjectId.GenerateNewId().ToString(),
                Title = dto.Title,
                Description = dto.Description,
                AssignedUsers = dto.AssignedUsers ?? new List<string>(),
                CreatedAt = DateTime.UtcNow,
                Deadline = dto.Deadline,
                Status = dto.Status ?? "Not Started",
                UpdatedAt = null
            };

            var created = await _projectRepository.CreateAsync(project);
            return ToProjectDTO(created);
        }

        public async Task<ProjectDTO?> UpdateAsync(string id, ProjectUpdateDto dto)
        {
            var existing = await _projectRepository.GetByIdAsync(id);
            if (existing == null) return null;

            existing.Title = dto.Title ?? existing.Title;
            existing.Description = dto.Description ?? existing.Description;
            existing.AssignedUsers = dto.AssignedUsers ?? existing.AssignedUsers;
            existing.Status = dto.Status ?? existing.Status;
            existing.Deadline = dto.Deadline ?? existing.Deadline;
            existing.UpdatedAt = DateTime.UtcNow;

            var updated = await _projectRepository.UpdateAsync(id, existing);
            return updated != null ? ToProjectDTO(updated) : null;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            return await _projectRepository.DeleteAsync(id);
        }

        private static ProjectDTO ToProjectDTO(Project project) => new ProjectDTO
        {
            Id = project.Id,
            Title = project.Title,
            Description = project.Description,
            AssignedUsers = project.AssignedUsers,
            CreatedAt = project.CreatedAt,
            Deadline = project.Deadline,
            Status = project.Status,
            UpdatedAt = project.UpdatedAt
        };
    }
}