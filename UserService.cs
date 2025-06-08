using System.Collections.Generic;
using System.Threading.Tasks;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Repositories;
using TodoApp.Api.Helpers;
using System.Linq;

namespace TodoApp.Api.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<List<User>> GetAllAsync()
        {
            return await _userRepository.GetAllAsync();
        }

        public async Task<PagedResult<UserDTO>> GetPagedAsync(UserQueryDto query)
        {
            var pagedUsers = await _userRepository.GetPagedAsync(query);
            
            var userDTOs = pagedUsers.Items.Select(user => new UserDTO
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                LastEditedByAdmin = user.LastEditedByAdmin
            }).ToList();

            return new PagedResult<UserDTO>
            {
                Items = userDTOs,
                TotalItems = pagedUsers.TotalItems,
                TotalPages = pagedUsers.TotalPages,
                CurrentPage = pagedUsers.CurrentPage,
                PageSize = pagedUsers.PageSize,
                HasNextPage = pagedUsers.HasNextPage,
                HasPreviousPage = pagedUsers.HasPreviousPage
            };
        }

        public async Task<User?> GetByIdAsync(string id)
        {
            return await _userRepository.GetByIdAsync(id);
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _userRepository.GetByEmailAsync(email);
        }

        public async Task<User> CreateAsync(UserCreateDto userCreateDto)
        {
            var hashedPassword = PasswordHelper.Hash(userCreateDto.Password);

            var userToCreate = new UserCreateDto
            {
                Name = userCreateDto.Name,
                Email = userCreateDto.Email.Trim().ToLowerInvariant(),
                Password = hashedPassword,
                Role = userCreateDto.Role ?? "user",
            };

            return await _userRepository.CreateAsync(userToCreate);
        }

        public async Task<User?> UpdateAsync(string id, UserUpdateDto userUpdateDto)
        {
            var existingUser = await _userRepository.GetByIdAsync(id);
            if (existingUser != null)
            {
                existingUser.Name = userUpdateDto.Name ?? existingUser.Name;
                existingUser.Email = userUpdateDto.Email ?? existingUser.Email;

                if (!string.IsNullOrEmpty(userUpdateDto.Password))
                {
                    existingUser.Password = PasswordHelper.Hash(userUpdateDto.Password);
                }

                existingUser.Role = userUpdateDto.Role ?? existingUser.Role;
                
               
                if (!string.IsNullOrEmpty(userUpdateDto.CurrentUserEmail))
                {
                    var currentUser = await _userRepository.GetByEmailAsync(userUpdateDto.CurrentUserEmail.Trim().ToLowerInvariant());
                    if (currentUser != null && currentUser.Role == "admin")
                    {
                        
                        bool hasChanges =
                            existingUser.Name != userUpdateDto.Name ||
                            existingUser.Email != userUpdateDto.Email ||
                            existingUser.Role != userUpdateDto.Role ||
                            !string.IsNullOrEmpty(userUpdateDto.Password);

                        if (hasChanges)
                        {
                            existingUser.LastEditedByAdmin = DateTime.UtcNow;
                        }
                    }
                }

                await _userRepository.UpdateAsync(id, existingUser);
                return existingUser;
            }
            return null;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var existingUser = await _userRepository.GetByIdAsync(id);
            if (existingUser != null)
            {
                await _userRepository.DeleteAsync(id);
                return true;
            }
            return false;
        }

        public async Task<bool> ValidatePasswordAsync(string email, string password)
        {
            var user = await _userRepository.GetByEmailAsync(email.Trim().ToLowerInvariant());

            if (user == null)
                return false;

            return PasswordHelper.Verify(password, user.Password);
        }

        public async Task<long> GetTotalCountAsync(UserFilterDto? filter = null)
        {
            return await _userRepository.GetTotalCountAsync(filter);
        }
    }
}