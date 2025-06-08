using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Services;

namespace TodoApp.Api.Controllers
{
    [Route("api/projects")]
    [ApiController]
    public class ProjectController : ControllerBase
    {
        private readonly IProjectService _projectService;
        private readonly ITaskService _taskService;

        public ProjectController(IProjectService projectService, ITaskService taskService)
        {
            _projectService = projectService;
            _taskService = taskService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<PagedResultDTO<ProjectDTO>>> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? sortBy = "createdAt",
            [FromQuery] string? sortOrder = "desc",
            [FromQuery] string? status = null,
            [FromQuery] string? assignedUser = null,
            [FromQuery] DateTime? createdFrom = null,
            [FromQuery] DateTime? createdTo = null,
            [FromQuery] DateTime? deadlineFrom = null,
            [FromQuery] DateTime? deadlineTo = null)
        {
            var filter = new ProjectFilterDTO
            {
                Page = page,
                PageSize = pageSize,
                Search = search,
                SortBy = sortBy,
                SortOrder = sortOrder,
                Status = status,
                AssignedUser = assignedUser,
                CreatedFrom = createdFrom,
                CreatedTo = createdTo,
                DeadlineFrom = deadlineFrom,
                DeadlineTo = deadlineTo
            };

            var result = await _projectService.GetAllAsync(filter);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<ProjectDTO>> GetById(string id)
        {
            var project = await _projectService.GetByIdAsync(id);
            if (project == null)
                return NotFound();

            return Ok(project);
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<ProjectDTO>> Create([FromBody] ProjectCreateDto projectCreateDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var createdProject = await _projectService.CreateAsync(projectCreateDto);
            return CreatedAtAction(nameof(GetById), new { id = createdProject.Id }, createdProject);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<ProjectDTO>> Update(string id, [FromBody] ProjectUpdateDto projectUpdateDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedProject = await _projectService.UpdateAsync(id, projectUpdateDto);
            if (updatedProject == null)
                return NotFound();

            return Ok(updatedProject);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(string id)
        {
            var success = await _projectService.DeleteAsync(id);
            if (!success)
                return NotFound();

            return NoContent();
        }

        [HttpGet("{projectId}/tasks")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetProjectTasks(string projectId)
        {
            var tasks = await _taskService.GetByProjectIdAsync(projectId);
            return Ok(tasks);
        }
    }
}