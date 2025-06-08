using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using TodoApp.Api.DTOs;
using TodoApp.Api.Services;

namespace TodoApp.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ITokenService _tokenService;

        public UserController(IUserService userService, ITokenService tokenService)
        {
            _userService = userService;
            _tokenService = tokenService;
        }

        [HttpGet("verify-token")]
        public IActionResult VerifyToken()
        {
            try
            {
                var authHeader = Request.Headers["Authorization"].FirstOrDefault();
                if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                {
                    return Unauthorized(new { message = "No token provided" });
                }

                var token = authHeader.Substring("Bearer ".Length);
                var principal = _tokenService.ValidateToken(token);

                if (principal == null)
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var email = principal.FindFirst(ClaimTypes.Email)?.Value;
                var role = principal.FindFirst(ClaimTypes.Role)?.Value;

                return Ok(new
                {
                    message = "Token is valid",
                    user = new
                    {
                        id = userId,
                        email = email,
                        role = role
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Token verification failed: {ex.Message}");
                return StatusCode(500, new { message = "Token verification failed" });
            }
        }

        [Authorize(Roles = "admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }

        [Authorize(Roles = "admin")]
        [HttpGet("paged")]
        public async Task<IActionResult> GetPaged([FromQuery] UserQueryDto query)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                Console.WriteLine($"[GetPaged] Query - Page: {query.Page}, PageSize: {query.PageSize}, Search: '{query.Search}', Role: '{query.Role}', SortBy: '{query.SortBy}', SortOrder: '{query.SortOrder}'");

                var result = await _userService.GetPagedAsync(query);

                Console.WriteLine($"[GetPaged] Retrieved {result.Items.Count} users out of {result.TotalItems} total");

                return Ok(new
                {
                    success = true,
                    data = result.Items,
                    pagination = new
                    {
                        currentPage = result.CurrentPage,
                        pageSize = result.PageSize,
                        totalItems = result.TotalItems,
                        totalPages = result.TotalPages,
                        hasNextPage = result.HasNextPage,
                        hasPreviousPage = result.HasPreviousPage
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetPaged] Error: {ex.Message}");
                Console.WriteLine($"[GetPaged] Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { 
                    success = false, 
                    message = $"Error retrieving paged users: {ex.Message}" 
                });
            }
        }

        [HttpGet("non-admin")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetNonAdminUsers([FromQuery] UserQueryDto? query = null)
        {
            try
            {
                Console.WriteLine("[GetNonAdminUsers] Starting to fetch users");

                if (query == null)
                {
                    query = new UserQueryDto();
                }

               
                var nonAdminQuery = new UserQueryDto
                {
                    Page = query.Page,
                    PageSize = query.PageSize,
                    Search = query.Search,
                    Role = "user", 
                    SortBy = query.SortBy,
                    SortOrder = query.SortOrder,
                    CreatedAfter = query.CreatedAfter,
                    CreatedBefore = query.CreatedBefore
                };

                var result = await _userService.GetPagedAsync(nonAdminQuery);

                Console.WriteLine($"[GetNonAdminUsers] Successfully retrieved {result.Items.Count} non-admin users");

                return Ok(new
                {
                    success = true,
                    data = result.Items, 
                    pagination = new
                    {
                        currentPage = result.CurrentPage,
                        pageSize = result.PageSize,
                        totalItems = result.TotalItems,
                        totalPages = result.TotalPages,
                        hasNextPage = result.HasNextPage,
                        hasPreviousPage = result.HasPreviousPage
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetNonAdminUsers] Error: {ex.Message}");
                Console.WriteLine($"[GetNonAdminUsers] Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { 
                    success = false, 
                    message = $"Error fetching non-admin users: {ex.Message}" 
                });
            }
        }

        [Authorize(Roles = "admin")]
        [HttpGet("search")]
        public async Task<IActionResult> SearchUsers(
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? role = null,
            [FromQuery] DateTime? createdAfter = null,
            [FromQuery] DateTime? createdBefore = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string sortBy = "CreatedAt",
            [FromQuery] string sortOrder = "desc")
        {
            try
            {
                var query = new UserQueryDto
                {
                    Page = page,
                    PageSize = pageSize,
                    Search = searchTerm,
                    Role = role,
                    SortBy = sortBy,
                    SortOrder = sortOrder,
                    CreatedAfter = createdAfter,
                    CreatedBefore = createdBefore
                };

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _userService.GetPagedAsync(query);

                return Ok(new
                {
                    success = true,
                    data = result.Items,
                    pagination = new
                    {
                        currentPage = result.CurrentPage,
                        pageSize = result.PageSize,
                        totalItems = result.TotalItems,
                        totalPages = result.TotalPages,
                        hasNextPage = result.HasNextPage,
                        hasPreviousPage = result.HasPreviousPage
                    },
                    filters = new
                    {
                        searchTerm,
                        role,
                        createdAfter,
                        createdBefore,
                        sortBy,
                        sortOrder
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SearchUsers] Error: {ex.Message}");
                return StatusCode(500, new { 
                    success = false, 
                    message = $"Error searching users: {ex.Message}" 
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UserCreateDto userCreateDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var createdUser = await _userService.CreateAsync(userCreateDto);
            return CreatedAtAction(nameof(GetById), new { id = createdUser.Id }, createdUser);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UserUpdateDto userUpdateDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = User.IsInRole("admin");

            if (id != currentUserId && !isAdmin)
                return Forbid("You can only update your own user data.");

            var updatedUser = await _userService.UpdateAsync(id, userUpdateDto);
            if (updatedUser == null)
                return NotFound(new { message = "User not found" });

            return Ok(updatedUser);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(string id)
        {
            var isDeleted = await _userService.DeleteAsync(id);
            if (!isDeleted)
                return NotFound(new { message = "User not found" });

            return NoContent();
        }

        [Authorize(Roles = "admin")]
        [HttpGet("stats")]
        public async Task<IActionResult> GetUserStats()
        {
            try
            {
                var totalUsers = await _userService.GetTotalCountAsync();
                var adminUsers = await _userService.GetTotalCountAsync(new UserFilterDto { Role = "admin" });
                var regularUsers = await _userService.GetTotalCountAsync(new UserFilterDto { Role = "user" });

                var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
                var recentUsers = await _userService.GetTotalCountAsync(new UserFilterDto { CreatedAfter = thirtyDaysAgo });

                return Ok(new
                {
                    totalUsers,
                    adminUsers,
                    regularUsers,
                    recentUsers,
                    calculatedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetUserStats] Error: {ex.Message}");
                return StatusCode(500, new { 
                    success = false, 
                    message = $"Error retrieving user statistics: {ex.Message}" 
                });
            }
        }
    }
}