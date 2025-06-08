using MongoDB.Driver;
using TodoApp.Api.Models;
using TodoApp.Api.Data;
using TodoApp.Api.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace TodoApp.Api.Repositories
{
    public class TaskRepository : ITaskRepository
    {
        private readonly IMongoCollection<TaskItem> _tasks;

        public TaskRepository(MongoDbContext context)
        {
            if (context == null)
                throw new ArgumentNullException(nameof(context));
                
            _tasks = context.Tasks;
            Console.WriteLine("[TaskRepository] Initialized with Tasks collection");
        }

        public async Task<List<TaskItem>> GetAllAsync()
        {
            try
            {
                var tasks = await _tasks.Find(_ => true).ToListAsync();
                
                foreach (var task in tasks)
                    task.SyncFields();
                
                return tasks;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error getting all tasks: {ex.Message}");
                return new List<TaskItem>();
            }
        }

        public async Task<TaskItem?> GetByIdAsync(string id)
        {
            if (string.IsNullOrEmpty(id))
                throw new ArgumentException("Task ID cannot be null or empty", nameof(id));
            
            try
            {
                var task = await _tasks.Find(task => task.Id == id).FirstOrDefaultAsync();
                task?.SyncFields();
                return task;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error getting task by ID {id}: {ex.Message}");
                return null;
            }
        }

        public async Task<IEnumerable<TaskItem>> GetTasksByUserIdAsync(string userId)
        {
            try
            {
                var filter = Builders<TaskItem>.Filter.Or(
                    Builders<TaskItem>.Filter.AnyEq(t => t.AssignedUsers, userId),
                    Builders<TaskItem>.Filter.Eq(t => t.AssignedTo, userId)
                );
                
                var tasks = await _tasks.Find(filter).ToListAsync();
                
                foreach (var task in tasks)
                    task.SyncFields();
                
                return tasks;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error getting tasks for user {userId}: {ex.Message}");
                return new List<TaskItem>();
            }
        }

        public async Task<IEnumerable<TaskItem>> GetTasksByProjectIdAsync(string projectId)
        {
            try
            {
                var filter = Builders<TaskItem>.Filter.Eq(t => t.ProjectId, projectId);
                var tasks = await _tasks.Find(filter).ToListAsync();
                
                foreach (var task in tasks)
                    task.SyncFields();
                
                return tasks;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error getting tasks for project {projectId}: {ex.Message}");
                return new List<TaskItem>();
            }
        }

        public async Task<TaskItem> CreateAsync(TaskItem taskItem)
        {
            try
            {
                taskItem.SyncFields();
                await _tasks.InsertOneAsync(taskItem);
                Console.WriteLine($"[TaskRepository] Created task: {taskItem.Id} - {taskItem.Name}");
                return taskItem;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error creating task: {ex.Message}");
                throw;
            }
        }

        public async Task<TaskItem?> UpdateAsync(string id, TaskItem taskIn)
        {
            if (string.IsNullOrEmpty(id))
                return null;
            
            try
            {
                taskIn.Id = id;
                taskIn.SyncFields();
                var result = await _tasks.ReplaceOneAsync(task => task.Id == id, taskIn);
                
                if (result.IsAcknowledged && result.ModifiedCount > 0)
                {
                    Console.WriteLine($"[TaskRepository] Updated task {id} - {taskIn.Name}");
                    return taskIn;
                }
                
                Console.WriteLine($"[TaskRepository] Task {id} not found or not modified");
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error updating task {id}: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> DeleteAsync(string id)
        {
            try
            {
                var result = await _tasks.DeleteOneAsync(task => task.Id == id);
                bool success = result.IsAcknowledged && result.DeletedCount > 0;
                
                if (success)
                    Console.WriteLine($"[TaskRepository] Deleted task {id}");
                else
                    Console.WriteLine($"[TaskRepository] Task {id} not found or not deleted");
                    
                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error deleting task {id}: {ex.Message}");
                return false;
            }
        }

        public async Task DeleteByProjectIdAsync(string projectId)
        {
            try
            {
                var result = await _tasks.DeleteManyAsync(task => task.ProjectId == projectId);
                
                if (result.IsAcknowledged)
                    Console.WriteLine($"[TaskRepository] Deleted {result.DeletedCount} tasks for project {projectId}");
                else
                    Console.WriteLine($"[TaskRepository] No tasks deleted for project {projectId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error deleting tasks for project {projectId}: {ex.Message}");
                throw;
            }
        }

        
        public async Task<(List<TaskItem> Tasks, long TotalCount)> GetTasksAsync(TaskQueryDto queryParameters)
        {
            try
            {
                var filter = Builders<TaskItem>.Filter.Empty;

                if (!string.IsNullOrEmpty(queryParameters.Status))
                    filter &= Builders<TaskItem>.Filter.Eq(t => t.Status, queryParameters.Status);

                if (!string.IsNullOrEmpty(queryParameters.ProjectId))
                    filter &= Builders<TaskItem>.Filter.Eq(t => t.ProjectId, queryParameters.ProjectId);

                if (!string.IsNullOrEmpty(queryParameters.Search))
                {
                    var searchRegex = new MongoDB.Bson.BsonRegularExpression(queryParameters.Search, "i");
                    filter &= Builders<TaskItem>.Filter.Or(
                        Builders<TaskItem>.Filter.Regex(t => t.Name, searchRegex),
                        Builders<TaskItem>.Filter.Regex(t => t.Description, searchRegex)
                    );
                }

                if (queryParameters.CreatedAfter.HasValue)
                    filter &= Builders<TaskItem>.Filter.Gte(t => t.CreatedAt, queryParameters.CreatedAfter.Value);

                if (queryParameters.CreatedBefore.HasValue)
                    filter &= Builders<TaskItem>.Filter.Lte(t => t.CreatedAt, queryParameters.CreatedBefore.Value);

                if (queryParameters.UpdatedAfter.HasValue)
                    filter &= Builders<TaskItem>.Filter.Gte(t => t.UpdatedAt, queryParameters.UpdatedAfter.Value);

                if (queryParameters.UpdatedBefore.HasValue)
                    filter &= Builders<TaskItem>.Filter.Lte(t => t.UpdatedAt, queryParameters.UpdatedBefore.Value);

                var sortBuilder = Builders<TaskItem>.Sort;
                SortDefinition<TaskItem> sort = sortBuilder.Descending(t => t.CreatedAt); // Default

                if (!string.IsNullOrEmpty(queryParameters.SortBy))
                {
                    var isAsc = queryParameters.SortOrder?.ToLower() == "asc";
                    sort = queryParameters.SortBy.ToLower() switch
                    {
                        "name" => isAsc ? sortBuilder.Ascending(t => t.Name) : sortBuilder.Descending(t => t.Name),
                        "status" => isAsc ? sortBuilder.Ascending(t => t.Status) : sortBuilder.Descending(t => t.Status),
                        "startdate" => isAsc ? sortBuilder.Ascending(t => t.StartDate) : sortBuilder.Descending(t => t.StartDate),
                        "enddate" => isAsc ? sortBuilder.Ascending(t => t.EndDate) : sortBuilder.Descending(t => t.EndDate),
                        "updatedat" => isAsc ? sortBuilder.Ascending(t => t.UpdatedAt) : sortBuilder.Descending(t => t.UpdatedAt),
                        _ => isAsc ? sortBuilder.Ascending(t => t.CreatedAt) : sortBuilder.Descending(t => t.CreatedAt)
                    };
                }

                var skip = (queryParameters.Page - 1) * queryParameters.PageSize;
                var totalCount = await _tasks.CountDocumentsAsync(filter);

                var taskItems = await _tasks.Find(filter)
                    .Sort(sort)
                    .Skip(skip)
                    .Limit(queryParameters.PageSize)
                    .ToListAsync();

                foreach (var task in taskItems)
                    task.SyncFields();

                return (taskItems, totalCount);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error in GetTasksAsync: {ex.Message}");
                return (new List<TaskItem>(), 0);
            }
        }

       
        public async Task<PagedTaskResult> GetPagedFilteredAsync(TaskQueryDto query)
        {
            try
            {
                var filter = Builders<TaskItem>.Filter.Empty;

                if (!string.IsNullOrEmpty(query.Status))
                    filter &= Builders<TaskItem>.Filter.Eq(t => t.Status, query.Status);

                if (!string.IsNullOrEmpty(query.ProjectId))
                    filter &= Builders<TaskItem>.Filter.Eq(t => t.ProjectId, query.ProjectId);

                if (!string.IsNullOrEmpty(query.Search))
                {
                    var searchRegex = new MongoDB.Bson.BsonRegularExpression(query.Search, "i");
                    filter &= Builders<TaskItem>.Filter.Or(
                        Builders<TaskItem>.Filter.Regex(t => t.Name, searchRegex),
                        Builders<TaskItem>.Filter.Regex(t => t.Description, searchRegex)
                    );
                }

                if (query.CreatedAfter.HasValue)
                    filter &= Builders<TaskItem>.Filter.Gte(t => t.CreatedAt, query.CreatedAfter.Value);

                if (query.CreatedBefore.HasValue)
                    filter &= Builders<TaskItem>.Filter.Lte(t => t.CreatedAt, query.CreatedBefore.Value);

                if (query.UpdatedAfter.HasValue)
                    filter &= Builders<TaskItem>.Filter.Gte(t => t.UpdatedAt, query.UpdatedAfter.Value);

                if (query.UpdatedBefore.HasValue)
                    filter &= Builders<TaskItem>.Filter.Lte(t => t.UpdatedAt, query.UpdatedBefore.Value);

                var sortBuilder = Builders<TaskItem>.Sort;
                SortDefinition<TaskItem> sort = sortBuilder.Descending(t => t.CreatedAt); 

                if (!string.IsNullOrEmpty(query.SortBy))
                {
                    var isAsc = query.SortOrder?.ToLower() == "asc";
                    sort = query.SortBy.ToLower() switch
                    {
                        "name" => isAsc ? sortBuilder.Ascending(t => t.Name) : sortBuilder.Descending(t => t.Name),
                        "status" => isAsc ? sortBuilder.Ascending(t => t.Status) : sortBuilder.Descending(t => t.Status),
                        "startdate" => isAsc ? sortBuilder.Ascending(t => t.StartDate) : sortBuilder.Descending(t => t.StartDate),
                        "enddate" => isAsc ? sortBuilder.Ascending(t => t.EndDate) : sortBuilder.Descending(t => t.EndDate),
                        "updatedat" => isAsc ? sortBuilder.Ascending(t => t.UpdatedAt) : sortBuilder.Descending(t => t.UpdatedAt),
                        _ => isAsc ? sortBuilder.Ascending(t => t.CreatedAt) : sortBuilder.Descending(t => t.CreatedAt)
                    };
                }

                var skip = (query.Page - 1) * query.PageSize;
                var totalCount = await _tasks.CountDocumentsAsync(filter);
                var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);

                var taskItems = await _tasks.Find(filter)
                    .Sort(sort)
                    .Skip(skip)
                    .Limit(query.PageSize)
                    .ToListAsync();

                foreach (var task in taskItems)
                    task.SyncFields();

                
                var taskDTOs = taskItems.Select(task => new TaskDTO
                {
                    Id = task.Id,
                    Name = task.Name,
                    Description = task.Description,
                    Status = task.Status,
                    ProjectId = task.ProjectId,
                    ProjectName = "", 
                    AssignedUsers = task.AssignedUsers ?? new List<string>(),
                    AssignedUserNames = new List<string>(), 
                    StartDate = task.StartDate,
                    EndDate = task.EndDate,
                    CreatedAt = task.CreatedAt,
                    UpdatedAt = task.UpdatedAt
                }).ToList();

                return new PagedTaskResult
                {
                    Tasks = taskDTOs,
                    TotalTasks = (int)totalCount,
                    TotalPages = totalPages,
                    CurrentPage = query.Page,
                    PageSize = query.PageSize,
                    HasNextPage = query.Page < totalPages,
                    HasPreviousPage = query.Page > 1
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TaskRepository] Error in GetPagedFilteredAsync: {ex.Message}");
                return new PagedTaskResult();
            }
        }
    }
}