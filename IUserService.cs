using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;

namespace TodoApp.Api.Services
{
    public interface IUserService
    {
        Task<List<User>> GetAllAsync();
        Task<PagedResult<UserDTO>> GetPagedAsync(UserQueryDto query);
        Task<User?> GetByIdAsync(string id);
        Task<User?> GetByEmailAsync(string email);
        Task<User> CreateAsync(UserCreateDto userCreateDto);
        Task<User?> UpdateAsync(string id, UserUpdateDto userUpdateDto);
        Task<bool> DeleteAsync(string id);
        Task<bool> ValidatePasswordAsync(string email, string password);
        Task<long> GetTotalCountAsync(UserFilterDto? filter = null);
    
    }
}
