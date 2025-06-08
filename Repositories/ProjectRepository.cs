using MongoDB.Driver;
using TodoApp.Api.Data;
using TodoApp.Api.Models;
using TodoApp.Api.DTOs;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Linq;

namespace TodoApp.Api.Repositories
{
    public class ProjectRepository : IProjectRepository
    {
        private readonly IMongoCollection<Project> _projects;

        public ProjectRepository(MongoDbContext context)
        {
            if (context == null)
                throw new ArgumentNullException(nameof(context));
                
            _projects = context.Projects;
            Console.WriteLine("[ProjectRepository] Initialized with collection: projects");
        }

        public async Task<PagedResultDTO<Project>> GetAllAsync(ProjectFilterDTO filter)
        {
            try
            {
                Console.WriteLine($"[ProjectRepository] Fetching projects with filter - Page: {filter.Page}, PageSize: {filter.PageSize}");
                
                var filterBuilder = Builders<Project>.Filter;
                var filters = new List<FilterDefinition<Project>>();

               
                if (!string.IsNullOrEmpty(filter.Search))
                {
                    var searchFilter = filterBuilder.Or(
                        filterBuilder.Regex(p => p.Title, new MongoDB.Bson.BsonRegularExpression(filter.Search, "i")),
                        filterBuilder.Regex(p => p.Description, new MongoDB.Bson.BsonRegularExpression(filter.Search, "i"))
                    );
                    filters.Add(searchFilter);
                    Console.WriteLine($"[ProjectRepository] Added search filter for: {filter.Search}");
                }

                
                if (!string.IsNullOrEmpty(filter.Status))
                {
                    filters.Add(filterBuilder.Eq(p => p.Status, filter.Status));
                    Console.WriteLine($"[ProjectRepository] Added status filter for: {filter.Status}");
                }

                
                if (!string.IsNullOrEmpty(filter.AssignedUser))
                {
                    filters.Add(filterBuilder.AnyEq(p => p.AssignedUsers, filter.AssignedUser));
                    Console.WriteLine($"[ProjectRepository] Added assigned user filter for: {filter.AssignedUser}");
                }

              
                if (filter.CreatedFrom.HasValue)
                {
                    filters.Add(filterBuilder.Gte(p => p.CreatedAt, filter.CreatedFrom.Value));
                    Console.WriteLine($"[ProjectRepository] Added created from filter: {filter.CreatedFrom.Value}");
                }

                if (filter.CreatedTo.HasValue)
                {
                    filters.Add(filterBuilder.Lte(p => p.CreatedAt, filter.CreatedTo.Value.AddDays(1).Date));
                    Console.WriteLine($"[ProjectRepository] Added created to filter: {filter.CreatedTo.Value}");
                }

               
                if (filter.DeadlineFrom.HasValue)
                {
                    filters.Add(filterBuilder.Gte(p => p.Deadline, filter.DeadlineFrom.Value));
                    Console.WriteLine($"[ProjectRepository] Added deadline from filter: {filter.DeadlineFrom.Value}");
                }

                if (filter.DeadlineTo.HasValue)
                {
                    filters.Add(filterBuilder.Lte(p => p.Deadline, filter.DeadlineTo.Value.AddDays(1).Date));
                    Console.WriteLine($"[ProjectRepository] Added deadline to filter: {filter.DeadlineTo.Value}");
                }

                
                var combinedFilter = filters.Count > 0 ? filterBuilder.And(filters) : filterBuilder.Empty;

                
                var sortBuilder = Builders<Project>.Sort;
                SortDefinition<Project> sortDefinition;

                switch (filter.SortBy?.ToLower())
                {
                    case "title":
                        sortDefinition = filter.SortOrder?.ToLower() == "asc" 
                            ? sortBuilder.Ascending(p => p.Title) 
                            : sortBuilder.Descending(p => p.Title);
                        break;
                    case "status":
                        sortDefinition = filter.SortOrder?.ToLower() == "asc" 
                            ? sortBuilder.Ascending(p => p.Status) 
                            : sortBuilder.Descending(p => p.Status);
                        break;
                    case "deadline":
                        sortDefinition = filter.SortOrder?.ToLower() == "asc" 
                            ? sortBuilder.Ascending(p => p.Deadline) 
                            : sortBuilder.Descending(p => p.Deadline);
                        break;
                    case "updatedat":
                        sortDefinition = filter.SortOrder?.ToLower() == "asc" 
                            ? sortBuilder.Ascending(p => p.UpdatedAt) 
                            : sortBuilder.Descending(p => p.UpdatedAt);
                        break;
                    case "createdat":
                    default:
                        sortDefinition = filter.SortOrder?.ToLower() == "asc" 
                            ? sortBuilder.Ascending(p => p.CreatedAt) 
                            : sortBuilder.Descending(p => p.CreatedAt);
                        break;
                }

                Console.WriteLine($"[ProjectRepository] Applied sort: {filter.SortBy} {filter.SortOrder}");

               
                var totalCount = await _projects.CountDocumentsAsync(combinedFilter);

               
                var skip = (filter.Page - 1) * filter.PageSize;
                var projects = await _projects
                    .Find(combinedFilter)
                    .Sort(sortDefinition)
                    .Skip(skip)
                    .Limit(filter.PageSize)
                    .ToListAsync();

                Console.WriteLine($"[ProjectRepository] Found {projects.Count} projects out of {totalCount} total");

                return new PagedResultDTO<Project>
                {
                    Items = projects,
                    TotalCount = (int)totalCount,
                    Page = filter.Page,
                    PageSize = filter.PageSize
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProjectRepository] Error fetching projects with filter: {ex.Message}");
                throw;
            }
        }

        public async Task<List<Project>> GetAllAsync()
        {
            try 
            {
                Console.WriteLine("[ProjectRepository] Fetching all projects from MongoDB");
                var projects = await _projects.Find(_ => true).ToListAsync();
                Console.WriteLine($"[ProjectRepository] Found {projects.Count} projects in database");
                return projects;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProjectRepository] Error fetching projects: {ex.Message}");
                throw;
            }
        }

        public async Task<Project?> GetByIdAsync(string id)
        {
            try
            {
                Console.WriteLine($"[ProjectRepository] Fetching project with ID: {id}");
                var project = await _projects.Find(p => p.Id == id).FirstOrDefaultAsync();
                Console.WriteLine($"[ProjectRepository] Project found: {(project != null)}");
                return project;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProjectRepository] Error fetching project by ID: {ex.Message}");
                throw;
            }
        }

        public async Task<Project> CreateAsync(Project project)
        {
            try
            {
                if (project == null)
                    throw new ArgumentNullException(nameof(project));
                    
                Console.WriteLine($"[ProjectRepository] Creating project with title: {project.Title}, ID: {project.Id}");
                
                if (!string.IsNullOrEmpty(project.Id))
                {
                    var existingProject = await _projects.Find(p => p.Id == project.Id).FirstOrDefaultAsync();
                    if (existingProject != null)
                    {
                        Console.WriteLine($"[ProjectRepository] Project with ID {project.Id} already exists");
                    }
                }
                
                await _projects.InsertOneAsync(project);
                Console.WriteLine($"[ProjectRepository] Project inserted with ID: {project.Id}");
                
                return project;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProjectRepository] Error creating project: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[ProjectRepository] Inner exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        public async Task<Project?> UpdateAsync(string id, Project project)
        {
            try
            {
                Console.WriteLine($"[ProjectRepository] Updating project with ID: {id}");
                
                project.Id = id;
                
                var result = await _projects.ReplaceOneAsync(p => p.Id == id, project);
                
                if (result.IsAcknowledged && result.ModifiedCount > 0)
                {
                    Console.WriteLine($"[ProjectRepository] Project updated successfully. ModifiedCount: {result.ModifiedCount}");
                    return project;
                }
                
                Console.WriteLine($"[ProjectRepository] Project update failed. IsAcknowledged: {result.IsAcknowledged}, ModifiedCount: {result.ModifiedCount}");
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProjectRepository] Error updating project: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteAsync(string id)
        {
            try
            {
                Console.WriteLine($"[ProjectRepository] Deleting project with ID: {id}");
                var result = await _projects.DeleteOneAsync(p => p.Id == id);
                Console.WriteLine($"[ProjectRepository] Project deletion result. IsAcknowledged: {result.IsAcknowledged}, DeletedCount: {result.DeletedCount}");
                return result.DeletedCount > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ProjectRepository] Error deleting project: {ex.Message}");
                throw;
            }
        }
    }
}