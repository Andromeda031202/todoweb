using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.Models;
using TodoApp.Api.DTOs;

namespace TodoApp.Api.Repositories
{
    public interface IUserRepository
    {
        Task<List<User>> GetAllAsync();
        Task<PagedResult<User>> GetPagedAsync(UserQueryDto query);
        Task<User?> GetByIdAsync(string id);
        Task<User?> GetByEmailAsync(string email);
        Task<User> CreateAsync(UserCreateDto userCreateDto);
        Task<bool> UpdateAsync(string id, User user);
        Task DeleteAsync(string id);
        Task<long> GetTotalCountAsync(UserFilterDto? filter = null);
    }

}
