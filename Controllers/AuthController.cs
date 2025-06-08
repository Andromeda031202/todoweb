using Microsoft.AspNetCore.Mvc;
using TodoApp.Api.Models;
using TodoApp.Api.DTOs;
using TodoApp.Api.Services;
using TodoApp.Api.Helpers;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace TodoApp.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ITokenService _tokenService;

        public AuthController(IUserService userService, ITokenService tokenService)
        {
            _userService = userService;
            _tokenService = tokenService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            if (!ModelState.IsValid || string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password) || string.IsNullOrWhiteSpace(model.Username))
            {
                return BadRequest(new { message = "Email, password, and username are required." });
            }

            var email = model.Email.Trim().ToLower();
            var existingUser = await _userService.GetByEmailAsync(email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "A user with this email already exists." });
            }

            var userDto = new UserCreateDto
            {
                Email = email,
                Password = model.Password,
                Name = model.Username.Trim(),
                Role = "user"
            };

            var newUser = await _userService.CreateAsync(userDto);
            var token = _tokenService.GenerateToken(newUser);

            return Ok(new
            {
                message = "User registered successfully.",
                token,
                user = new
                {
                    id = newUser.Id,
                    email = newUser.Email,
                    username = newUser.Name,
                    role = newUser.Role
                }
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            if (!ModelState.IsValid || string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest(new { message = "Email and password are required." });
            }

            var email = model.Email.Trim().ToLower();
            var user = await _userService.GetByEmailAsync(email);
            if (user == null || string.IsNullOrEmpty(user.Password))
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            bool isPasswordValid = false;
            try
            {
                isPasswordValid = await _userService.ValidatePasswordAsync(email, model.Password);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Password verification failed: {ex.Message}");
                return Unauthorized(new { message = "Invalid email or password." });
            }

            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            if (!string.IsNullOrEmpty(model.Role) && !string.Equals(user.Role, model.Role, StringComparison.OrdinalIgnoreCase))
            {
                return Unauthorized(new { message = $"You don't have {model.Role} privileges." });
            }

            var token = _tokenService.GenerateToken(user);

            return Ok(new
            {
                token,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    username = user.Name,
                    role = user.Role
                }
            });
        }

        [HttpGet("check-admin-exists")]
        public async Task<IActionResult> CheckAdminExists()
        {
            try
            {
                var users = await _userService.GetAllAsync();
                var adminExists = users.Any(u => u.Role.Equals("admin", StringComparison.OrdinalIgnoreCase));

                return Ok(new
                {
                    adminExists,
                    totalUsers = users.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error checking admin", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UserUpdateDto userUpdateDto)
        {
            var existingUser = await _userService.GetByIdAsync(id);
            if (existingUser == null)
            {
                return NotFound(new { message = "User not found." });
            }

            await _userService.UpdateAsync(id, userUpdateDto);
            return Ok(new { message = "User updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var existingUser = await _userService.GetByIdAsync(id);
            if (existingUser == null)
            {
                return NotFound(new { message = "User not found." });
            }

            await _userService.DeleteAsync(id);
            return Ok(new { message = "User deleted successfully." });
        }
    }

    public class LoginModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Role { get; set; }
    }

    public class RegisterModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
    }
}
