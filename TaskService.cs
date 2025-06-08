using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using TodoApp.Api.Data;
using TodoApp.Api.Models;
using TodoApp.Api.Repositories;
using TodoApp.Api.DTOs;

namespace TodoApp.Api.Services
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _taskRepository;
        private readonly IMongoCollection<TaskItem> _tasks;
        private readonly ILogger<TaskService> _logger;

        public TaskService(
            ITaskRepository taskRepository,
            MongoDbContext context,
            ILogger<TaskService> logger)
        {
            _taskRepository = taskRepository ?? throw new ArgumentNullException(nameof(taskRepository));
            _tasks = context?.Tasks ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private void ValidateId(string id, string paramName)
        {
            if (string.IsNullOrWhiteSpace(id))
                throw new ArgumentException($"{paramName} cannot be null or empty", paramName);
        }

        public async Task<List<TaskItem>> GetAllAsync()
        {
            try
            {
                return await _taskRepository.GetAllAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAllAsync");
                throw;
            }
        }

        public async Task<TaskItem?> GetByIdAsync(string id)
        {
            try
            {
                ValidateId(id, nameof(id));
                return await _taskRepository.GetByIdAsync(id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetByIdAsync for Id={Id}", id);
                throw;
            }
        }

        public async Task<List<TaskItem>> GetByProjectIdAsync(string projectId)
        {
            try
            {
                ValidateId(projectId, nameof(projectId));
                var tasks = await _taskRepository.GetTasksByProjectIdAsync(projectId) ?? Enumerable.Empty<TaskItem>();
                return tasks.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetByProjectIdAsync for ProjectId={ProjectId}", projectId);
                throw;
            }
        }

        public async Task<List<TaskItem>> GetByUserIdAsync(string userId)
        {
            try
            {
                ValidateId(userId, nameof(userId));
                var tasks = await _taskRepository.GetTasksByUserIdAsync(userId) ?? Enumerable.Empty<TaskItem>();
                return tasks.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetByUserIdAsync for UserId={UserId}", userId);
                throw;
            }
        }

        public async Task<TaskItem> CreateAsync(TaskItem task)
        {
            if (task == null) throw new ArgumentNullException(nameof(task));

            try
            {
                task.StartDate ??= DateTime.UtcNow;
                task.AssignedUsers ??= new List<string>();
                task.SyncFields();

                _logger.LogInformation("Creating task: Name={Name}, ProjectId={ProjectId}, Status={Status}, AssignedUsers=[{Users}]",
                    task.Name, task.ProjectId, task.Status, string.Join(", ", task.AssignedUsers));

                var createdTask = await _taskRepository.CreateAsync(task);
                _logger.LogInformation("Task created successfully with ID: {Id}", createdTask.Id);

                return createdTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                throw;
            }
        }

       public async Task<TaskItem?> UpdateAsync(string id, TaskItem taskIn)
{
    ValidateId(id, nameof(id));
    if (taskIn == null) throw new ArgumentNullException(nameof(taskIn));

    try
    {
        var originalTask = await _taskRepository.GetByIdAsync(id);
        if (originalTask == null)
        {
            _logger.LogWarning("Task with ID {Id} not found for update", id);
            return null;
        }

       
        taskIn.Id = id;

       
        if (string.IsNullOrEmpty(taskIn.Name))
            taskIn.Name = originalTask.Name;

        if (string.IsNullOrEmpty(taskIn.Description))
            taskIn.Description = originalTask.Description;

        if (string.IsNullOrEmpty(taskIn.Status))
            taskIn.Status = originalTask.Status;

        if (string.IsNullOrEmpty(taskIn.ProjectId))
            taskIn.ProjectId = originalTask.ProjectId;

        if (taskIn.AssignedUsers == null || !taskIn.AssignedUsers.Any())
            taskIn.AssignedUsers = originalTask.AssignedUsers ?? new List<string>();

        if (!taskIn.StartDate.HasValue)
            taskIn.StartDate = originalTask.StartDate;

        if (!taskIn.EndDate.HasValue)
            taskIn.EndDate = originalTask.EndDate;

       
        taskIn.SyncFields();

        _logger.LogInformation("Updating task {Id}: Name={Name}, Status={Status}, AssignedUsers=[{Users}]",
            id, taskIn.Name, taskIn.Status, string.Join(", ", taskIn.AssignedUsers));

        var updatedTask = await _taskRepository.UpdateAsync(id, taskIn);

        if (updatedTask != null)
            _logger.LogInformation("Task updated successfully: {Name}", updatedTask.Name);
        else
            _logger.LogWarning("Failed to update task with ID: {Id}", id);

        return updatedTask;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error updating task with ID {Id}", id);
        throw;
    }
}

        public async Task<bool> DeleteAsync(string id)
        {
            ValidateId(id, nameof(id));

            try
            {
                _logger.LogInformation("Deleting task with ID: {Id}", id);
                var result = await _taskRepository.DeleteAsync(id);

                if (result)
                    _logger.LogInformation("Task {Id} deleted successfully", id);
                else
                    _logger.LogWarning("Task {Id} not found for deletion", id);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting task with ID {Id}", id);
                throw;
            }
        }

       
        public async Task<(List<TaskItem> Tasks, long TotalCount)> GetTasksAsync(TaskQueryDto queryParameters)
        {
            try
            {
                return await _taskRepository.GetTasksAsync(queryParameters);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetTasksAsync");
                throw;
            }
        }

        public async Task RemoveByProjectIdAsync(string projectId)
        {
            ValidateId(projectId, nameof(projectId));

            try
            {
                _logger.LogInformation("Removing all tasks for project: {ProjectId}", projectId);
                await _taskRepository.DeleteByProjectIdAsync(projectId);
                _logger.LogInformation("All tasks removed for project: {ProjectId}", projectId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing tasks by project ID {ProjectId}", projectId);
                throw;
            }
        }

        public async Task<bool> InitializeCollection()
        {
            try
            {
                var filter = new BsonDocument("name", "tasks");
                var collections = await _tasks.Database.ListCollectionsAsync(new ListCollectionsOptions { Filter = filter });

                if (!await collections.AnyAsync())
                {
                    await _tasks.Database.CreateCollectionAsync("tasks");
                    _logger.LogInformation("Created new tasks collection");
                }

                var existingTasksCount = await _tasks.CountDocumentsAsync(Builders<TaskItem>.Filter.Empty);
                _logger.LogInformation("Found {Count} existing tasks", existingTasksCount);

                if (existingTasksCount == 0)
                {
                    _logger.LogInformation("Creating sample tasks...");
                    await CreateSampleTasksAsync();
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing tasks collection");
                return false;
            }
        }

        private async Task CreateSampleTasksAsync()
        {
            try
            {
                var client = new MongoClient(_tasks.Database.Client.Settings);
                var database = client.GetDatabase(_tasks.Database.DatabaseNamespace.DatabaseName);

                var usersCollection = database.GetCollection<User>("users");
                var projectsCollection = database.GetCollection<Project>("projects");

                var admin = await usersCollection.Find(u => u.Role == "admin").FirstOrDefaultAsync();
                if (admin == null)
                {
                    _logger.LogWarning("No admin user found for task assignment");
                    return;
                }

                var projects = await projectsCollection.Find(FilterDefinition<Project>.Empty).ToListAsync();
                if (!projects.Any())
                {
                    _logger.LogWarning("No projects found for task assignment");
                    return;
                }

                var sampleTasks = new List<TaskItem>();

                foreach (var project in projects)
                {
                    _logger.LogInformation("Creating tasks for project: {ProjectTitle} (ID: {ProjectId})", project.Title, project.Id);

                    sampleTasks.AddRange(new[]
                    {
                        new TaskItem
                        {
                            Name = $"Research for {project.Title}",
                            Description = "Gather requirements and research solutions",
                            Status = "Not Started",
                            EndDate = DateTime.UtcNow.AddDays(7),
                            ProjectId = project.Id,
                            AssignedUsers = new List<string> { admin.Id }
                        },
                        new TaskItem
                        {
                            Name = $"Design UI for {project.Title}",
                            Description = "Create wireframes and mockups",
                            Status = "In Progress",
                            EndDate = DateTime.UtcNow.AddDays(14),
                            ProjectId = project.Id,
                            AssignedUsers = new List<string> { admin.Id }
                        },
                        new TaskItem
                        {
                            Name = $"Develop backend for {project.Title}",
                            Description = "Implement API endpoints",
                            Status = "Pending",
                            EndDate = DateTime.UtcNow.AddDays(21),
                            ProjectId = project.Id,
                            AssignedUsers = new List<string> { admin.Id }
                        },
                        new TaskItem
                        {
                            Name = $"Test {project.Title} functionalities",
                            Description = "Perform unit and integration tests",
                            Status = "Pending",
                            EndDate = DateTime.UtcNow.AddDays(28),
                            ProjectId = project.Id,
                            AssignedUsers = new List<string> { admin.Id }
                        }
                    });
                }

                foreach (var task in sampleTasks)
                {
                    task.SyncFields();
                    await _taskRepository.CreateAsync(task);
                }

                _logger.LogInformation("Sample tasks created successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating sample tasks");
            }
        }
    }
}