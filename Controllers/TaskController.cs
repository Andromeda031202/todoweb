using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Services;
using System;
using System.Linq;

namespace TodoApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TaskController : ControllerBase
    {
        private readonly ITaskService _taskService;
        private readonly IProjectService _projectService;
        private readonly IUserService _userService;

        public TaskController(ITaskService taskService, IProjectService projectService, IUserService userService)
        {
            _taskService = taskService;
            _projectService = projectService;
            _userService = userService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskDTO>>> GetAll()
        {
            try
            {
                var tasks = await _taskService.GetAllAsync();
                var taskDtos = await ConvertToTaskDTOs(tasks);
                return Ok(taskDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving tasks", details = ex.Message });
            }
        }

        [HttpGet("paged")]
        public async Task<ActionResult<PagedTaskResult>> GetPagedTasks([FromQuery] TaskQueryDto query)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var allTasks = await _taskService.GetAllAsync();
                var filteredTasks = allTasks.AsQueryable();

            
                if (!string.IsNullOrEmpty(query.Search))
                {
                    filteredTasks = filteredTasks.Where(t => 
                        t.Name.Contains(query.Search, StringComparison.OrdinalIgnoreCase) ||
                        t.Description.Contains(query.Search, StringComparison.OrdinalIgnoreCase));
                }

                
                if (!string.IsNullOrEmpty(query.Status))
                {
                    filteredTasks = filteredTasks.Where(t => t.Status.Equals(query.Status, StringComparison.OrdinalIgnoreCase));
                }

                
                if (!string.IsNullOrEmpty(query.ProjectId))
                {
                    filteredTasks = filteredTasks.Where(t => t.ProjectId == query.ProjectId);
                }

                
                if (query.CreatedAfter.HasValue)
                {
                    filteredTasks = filteredTasks.Where(t => t.CreatedAt >= query.CreatedAfter.Value);
                }

                if (query.CreatedBefore.HasValue)
                {
                    filteredTasks = filteredTasks.Where(t => t.CreatedAt <= query.CreatedBefore.Value);
                }

                if (query.UpdatedAfter.HasValue)
                {
                    filteredTasks = filteredTasks.Where(t => t.UpdatedAt >= query.UpdatedAfter.Value);
                }

                if (query.UpdatedBefore.HasValue)
                {
                    filteredTasks = filteredTasks.Where(t => t.UpdatedAt <= query.UpdatedBefore.Value);
                }

                
                if (!string.IsNullOrEmpty(query.SortBy))
                {
                    var isDescending = query.SortOrder?.ToLower() == "desc";
                    
                    filteredTasks = query.SortBy.ToLower() switch
                    {
                        "name" => isDescending ? filteredTasks.OrderByDescending(t => t.Name) : filteredTasks.OrderBy(t => t.Name),
                        "status" => isDescending ? filteredTasks.OrderByDescending(t => t.Status) : filteredTasks.OrderBy(t => t.Status),
                        "startdate" => isDescending ? filteredTasks.OrderByDescending(t => t.StartDate) : filteredTasks.OrderBy(t => t.StartDate),
                        "enddate" => isDescending ? filteredTasks.OrderByDescending(t => t.EndDate) : filteredTasks.OrderBy(t => t.EndDate),
                        "updatedat" => isDescending ? filteredTasks.OrderByDescending(t => t.UpdatedAt) : filteredTasks.OrderBy(t => t.UpdatedAt),
                        _ => isDescending ? filteredTasks.OrderByDescending(t => t.CreatedAt) : filteredTasks.OrderBy(t => t.CreatedAt)
                    };
                }
                else
                {
                    
                    filteredTasks = filteredTasks.OrderByDescending(t => t.CreatedAt);
                }

                var totalTasks = filteredTasks.Count();
                var totalPages = (int)Math.Ceiling((double)totalTasks / query.PageSize);

                
                var skip = (query.Page - 1) * query.PageSize;
                var pagedTasks = filteredTasks.Skip(skip).Take(query.PageSize).ToList();
                var taskDtos = await ConvertToTaskDTOs(pagedTasks);

                var result = new PagedTaskResult
                {
                    Tasks = taskDtos,
                    TotalTasks = totalTasks,
                    TotalPages = totalPages,
                    CurrentPage = query.Page,
                    PageSize = query.PageSize,
                    HasNextPage = query.Page < totalPages,
                    HasPreviousPage = query.Page > 1
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving tasks", details = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskDTO>> GetById(string id)
        {
            if (string.IsNullOrEmpty(id))
                return BadRequest("Task ID is required");

            try
            {
                var task = await _taskService.GetByIdAsync(id);
                if (task == null)
                    return NotFound($"Task with ID {id} not found");

                var taskDto = await ConvertToTaskDTO(task);
                return Ok(taskDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving the task", details = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<TaskDTO>> Create([FromBody] TaskCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                
                var project = await _projectService.GetByIdAsync(dto.ProjectId);
                if (project == null)
                    return BadRequest($"Project with ID {dto.ProjectId} not found");

                
                if (dto.AssignedUsers != null && dto.AssignedUsers.Any())
                {
                    foreach (var userId in dto.AssignedUsers)
                    {
                        var user = await _userService.GetByIdAsync(userId);
                        if (user == null)
                            return BadRequest($"User with ID {userId} not found");
                    }
                }

                var task = new TaskItem
                {
                    Name = dto.Name,
                    Description = dto.Description,
                    Status = dto.Status,
                    ProjectId = dto.ProjectId,
                    AssignedUsers = dto.AssignedUsers ?? new List<string>(),
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var created = await _taskService.CreateAsync(task);
                var taskDto = await ConvertToTaskDTO(created);
                return CreatedAtAction(nameof(GetById), new { id = taskDto.Id }, taskDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while creating the task", details = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TaskDTO>> Update(string id, [FromBody] TaskUpdateDto dto)
        {
            if (string.IsNullOrEmpty(id))
                return BadRequest("Task ID is required");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var existing = await _taskService.GetByIdAsync(id);
                if (existing == null)
                    return NotFound($"Task with ID {id} not found");

               
                if (!string.IsNullOrEmpty(dto.Name))
                    existing.Name = dto.Name;

                if (!string.IsNullOrEmpty(dto.Description))
                    existing.Description = dto.Description;

                if (!string.IsNullOrEmpty(dto.Status))
                    existing.Status = dto.Status;

                if (dto.AssignedUsers != null)
                {
                    foreach (var userId in dto.AssignedUsers)
                    {
                        var user = await _userService.GetByIdAsync(userId);
                        if (user == null)
                            return BadRequest($"User with ID {userId} not found");
                    }
                    existing.AssignedUsers = dto.AssignedUsers;
                }

                if (dto.StartDate.HasValue)
                    existing.StartDate = dto.StartDate;

                if (dto.EndDate.HasValue)
                    existing.EndDate = dto.EndDate;

                existing.UpdatedAt = DateTime.UtcNow;

                var updated = await _taskService.UpdateAsync(id, existing);
                if (updated == null)
                    return NotFound($"Task with ID {id} could not be updated");

                var taskDto = await ConvertToTaskDTO(updated);
                return Ok(taskDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while updating the task", details = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(string id)
        {
            if (string.IsNullOrEmpty(id))
                return BadRequest("Task ID is required");

            try
            {
                var existing = await _taskService.GetByIdAsync(id);
                if (existing == null)
                    return NotFound($"Task with ID {id} not found");

                var result = await _taskService.DeleteAsync(id);
                if (!result)
                    return StatusCode(500, "Failed to delete the task");

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while deleting the task", details = ex.Message });
            }
        }

        [HttpGet("project/{projectId}")]
        public async Task<ActionResult<IEnumerable<TaskDTO>>> GetTasksByProject(string projectId)
        {
            if (string.IsNullOrEmpty(projectId))
                return BadRequest("Project ID is required");

            try
            {
                var tasks = await _taskService.GetByProjectIdAsync(projectId);
                var taskDtos = await ConvertToTaskDTOs(tasks);
                return Ok(taskDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving tasks", details = ex.Message });
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskDTO>>> GetTasksByUser(string userId)
        {
            if (string.IsNullOrEmpty(userId))
                return BadRequest("User ID is required");

            try
            {
                var allTasks = await _taskService.GetAllAsync();
                var userTasks = allTasks.Where(t => t.AssignedUsers != null && t.AssignedUsers.Contains(userId)).ToList();
                var taskDtos = await ConvertToTaskDTOs(userTasks);
                return Ok(taskDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving tasks", details = ex.Message });
            }
        }

        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<TaskDTO>>> GetTasksByStatus(string status)
        {
            if (string.IsNullOrEmpty(status))
                return BadRequest("Status is required");

            try
            {
                var allTasks = await _taskService.GetAllAsync();
                var statusTasks = allTasks.Where(t => t.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
                var taskDtos = await ConvertToTaskDTOs(statusTasks);
                return Ok(taskDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while retrieving tasks", details = ex.Message });
            }
        }

        private async Task<TaskDTO> ConvertToTaskDTO(TaskItem task)
        {
            string projectName = "";
            var assignedUserNames = new List<string>();

            if (!string.IsNullOrEmpty(task.ProjectId))
            {
                try
                {
                    var project = await _projectService.GetByIdAsync(task.ProjectId);
                    projectName = project?.Title ?? "";
                }
                catch
                {
                    
                }
            }

           
            if (task.AssignedUsers != null && task.AssignedUsers.Any())
            {
                foreach (var userId in task.AssignedUsers)
                {
                    try
                    {
                        var user = await _userService.GetByIdAsync(userId);
                        if (user != null)
                        {
                           
                            var userName = user.Name ?? user.Email ?? userId;
                            assignedUserNames.Add(userName);
                        }
                        else
                        {
                            assignedUserNames.Add(userId);
                        }
                    }
                    catch
                    {
                        
                        assignedUserNames.Add(userId);
                    }
                }
            }

            return new TaskDTO
            {
                Id = task.Id,
                Name = task.Name,
                Description = task.Description,
                Status = task.Status,
                ProjectId = task.ProjectId,
                ProjectName = projectName,
                AssignedUsers = task.AssignedUsers ?? new List<string>(),
                AssignedUserNames = assignedUserNames,
                StartDate = task.StartDate,
                EndDate = task.EndDate,
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt
            };
        }

        private async Task<List<TaskDTO>> ConvertToTaskDTOs(List<TaskItem> tasks)
        {
            var taskDtos = new List<TaskDTO>();

            foreach (var task in tasks)
            {
                var taskDto = await ConvertToTaskDTO(task);
                taskDtos.Add(taskDto);
            }

            return taskDtos;
        }
    }
}