using MongoDB.Driver;
using MongoDB.Bson;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.Models;
using TodoApp.Api.DTOs;
using System.Linq;

namespace TodoApp.Api.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly IMongoCollection<User> _users;

        public UserRepository(IMongoDatabase database)
        {
            _users = database.GetCollection<User>("Users");

            var indexKeysDefinition = Builders<User>.IndexKeys.Ascending(u => u.Email);
            var indexOptions = new CreateIndexOptions { Unique = true };
            var indexModel = new CreateIndexModel<User>(indexKeysDefinition, indexOptions);
            _users.Indexes.CreateOne(indexModel);
        }

        public async Task<List<User>> GetAllAsync()
        {
            try
            {
                var filter = Builders<User>.Filter.Empty;
                var users = await _users.Find(filter).ToListAsync();
                return users ?? new List<User>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UserRepository.GetAllAsync] MongoDB Error: {ex.Message}");
                Console.WriteLine($"[UserRepository.GetAllAsync] Stack trace: {ex.StackTrace}");
                throw new Exception("Failed to retrieve users from database", ex);
            }
        }

        public async Task<PagedResult<User>> GetPagedAsync(UserQueryDto query)
        {
            try
            {
                var filter = BuildFilter(new UserFilterDto
                {
                    Search = query.Search,
                    Role = query.Role,
                    CreatedAfter = query.CreatedAfter,
                    CreatedBefore = query.CreatedBefore
                });

                var totalCount = await _users.CountDocumentsAsync(filter);

                var sort = BuildSort(new UserSortDto
                {
                    SortBy = query.SortBy ?? "CreatedAt",
                    SortOrder = query.SortOrder ?? "desc"
                });

                var skip = (query.Page - 1) * query.PageSize;

                var users = await _users
                    .Find(filter)
                    .Sort(sort)
                    .Skip(skip)
                    .Limit(query.PageSize)
                    .ToListAsync();

                var totalPages = (int)Math.Ceiling((double)totalCount / query.PageSize);

                return new PagedResult<User>
                {
                    Items = users,
                    TotalItems = (int)totalCount,
                    TotalPages = totalPages,
                    CurrentPage = query.Page,
                    PageSize = query.PageSize,
                    HasNextPage = query.Page < totalPages,
                    HasPreviousPage = query.Page > 1
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UserRepository.GetPagedAsync] MongoDB Error: {ex.Message}");
                Console.WriteLine($"[UserRepository.GetPagedAsync] Stack trace: {ex.StackTrace}");
                throw new Exception("Failed to retrieve paged users from database", ex);
            }
        }

        public async Task<User?> GetByIdAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return null;

            return await _users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return null;

            var normalizedEmail = email.Trim().ToLowerInvariant();
            var filter = Builders<User>.Filter.Eq(u => u.Email, normalizedEmail);
            return await _users.Find(filter).FirstOrDefaultAsync();
        }

        public async Task<User> CreateAsync(UserCreateDto userCreateDto)
        {
            if (userCreateDto == null)
                throw new ArgumentNullException(nameof(userCreateDto));

            var now = DateTime.UtcNow;
            var user = new User
            {
                Name = userCreateDto.Name?.Trim() ?? throw new ArgumentException("Name cannot be null"),
                Email = userCreateDto.Email.Trim().ToLowerInvariant(),
                Password = userCreateDto.Password,
                Role = userCreateDto.Role ?? "user",
                CreatedAt = now,
                UpdatedAt = now, 
                Projects = new List<string>(),
                Tasks = new List<string>()
            };

            await _users.InsertOneAsync(user);
            return user;
        }

        public async Task<bool> UpdateAsync(string id, User user)
        {
            if (string.IsNullOrWhiteSpace(id)) return false;
            if (user == null) throw new ArgumentNullException(nameof(user));

            
            user.UpdatedAt = DateTime.UtcNow;

            var result = await _users.ReplaceOneAsync(u => u.Id == id, user);
            return result.IsAcknowledged && result.ModifiedCount > 0;
        }

        public async Task DeleteAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return;

            await _users.DeleteOneAsync(u => u.Id == id);
        }

        public async Task<long> GetTotalCountAsync(UserFilterDto? filter = null)
        {
            var mongoFilter = filter != null ? BuildFilter(filter) : Builders<User>.Filter.Empty;
            return await _users.CountDocumentsAsync(mongoFilter);
        }

        private FilterDefinition<User> BuildFilter(UserFilterDto filter)
        {
            var builder = Builders<User>.Filter;
            var filters = new List<FilterDefinition<User>>();

            
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var searchRegex = new BsonRegularExpression(filter.Search, "i"); 
                var searchFilter = builder.Or(
                    builder.Regex(u => u.Name, searchRegex),
                    builder.Regex(u => u.Email, searchRegex)
                );
                filters.Add(searchFilter);
            }

            
            if (!string.IsNullOrWhiteSpace(filter.Role))
            {
                
                var roleRegex = new BsonRegularExpression($"^{filter.Role}$", "i");
                filters.Add(builder.Regex(u => u.Role, roleRegex));
            }

           
            if (filter.CreatedAfter.HasValue)
            {
                filters.Add(builder.Gte(u => u.CreatedAt, filter.CreatedAfter.Value));
            }

            if (filter.CreatedBefore.HasValue)
            {
                filters.Add(builder.Lte(u => u.CreatedAt, filter.CreatedBefore.Value));
            }

            return filters.Count > 0 ? builder.And(filters) : builder.Empty;
        }

        private SortDefinition<User> BuildSort(UserSortDto sort)
        {
            var builder = Builders<User>.Sort;
            var isDescending = sort.SortOrder?.ToLowerInvariant() == "desc";

            return sort.SortBy?.ToLowerInvariant() switch
            {
                "name" => isDescending ? builder.Descending(u => u.Name) : builder.Ascending(u => u.Name),
                "email" => isDescending ? builder.Descending(u => u.Email) : builder.Ascending(u => u.Email),
                "role" => isDescending ? builder.Descending(u => u.Role) : builder.Ascending(u => u.Role),
                "createdat" => isDescending ? builder.Descending(u => u.CreatedAt) : builder.Ascending(u => u.CreatedAt),
                "updatedat" => isDescending ? builder.Descending(u => u.UpdatedAt) : builder.Ascending(u => u.UpdatedAt),
                _ => builder.Descending(u => u.CreatedAt) 
            };
        }
    }
}