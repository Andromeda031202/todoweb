using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TodoApp.Api.Data;
using TodoApp.Api.Configuration;
using TodoApp.Api.Models;

namespace TodoApp.Api.Services
{
    public class TokenService : ITokenService
    {
        private readonly JwtConfig _jwtConfig;
        private readonly TokenValidationParameters _tokenValidationParameters;

        public TokenService(IOptions<JwtConfig> jwtConfig)
        {
            _jwtConfig = jwtConfig.Value;
            
                        _tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtConfig.SecretKey)),
                ValidateIssuer = true,
                ValidIssuer = _jwtConfig.Issuer,
                ValidateAudience = true,
                ValidAudience = _jwtConfig.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RoleClaimType = ClaimTypes.Role
            };
        }

        public string GenerateToken(User user)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_jwtConfig.SecretKey);

                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Name, user.Name),
                    new Claim(ClaimTypes.Role, user.Role)
                };

                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(claims),
                    Expires = DateTime.UtcNow.AddHours(24),
                    Issuer = _jwtConfig.Issuer,
                    Audience = _jwtConfig.Audience,
                    SigningCredentials = new SigningCredentials(
                        new SymmetricSecurityKey(key),
                        SecurityAlgorithms.HmacSha256Signature)
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);
                var tokenString = tokenHandler.WriteToken(token);

                                var jwtToken = tokenHandler.ReadJwtToken(tokenString);
                Console.WriteLine($"[TokenService] Generated JWT Token Details:");
                Console.WriteLine($"Issuer: {jwtToken.Issuer}");
                Console.WriteLine($"Audience: {jwtToken.Audiences.FirstOrDefault()}");
                Console.WriteLine($"Expiration: {jwtToken.ValidTo}");
                Console.WriteLine($"Claims: {string.Join(", ", jwtToken.Claims.Select(c => $"{c.Type}={c.Value}"))}");

                return tokenString;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TokenService] Error generating token: {ex.Message}");
                throw;
            }
        }

        public ClaimsPrincipal? ValidateToken(string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                Console.WriteLine("[TokenService] Token is null or empty");
                return default;
            }

            var tokenHandler = new JwtSecurityTokenHandler();

            try
            {
                                var jwtToken = tokenHandler.ReadJwtToken(token);
                Console.WriteLine($"[TokenService] Validating Token Details:");
                Console.WriteLine($"Issuer: {jwtToken.Issuer}");
                Console.WriteLine($"Audience: {jwtToken.Audiences.FirstOrDefault()}");
                Console.WriteLine($"Expiration: {jwtToken.ValidTo}");
                Console.WriteLine($"Claims: {string.Join(", ", jwtToken.Claims.Select(c => $"{c.Type}={c.Value}"))}");

                var principal = tokenHandler.ValidateToken(token, _tokenValidationParameters, out var validatedToken);

                                Console.WriteLine("[TokenService] Token validated successfully");
                return principal;
            }
            catch (SecurityTokenExpiredException ex)
            {
                Console.WriteLine($"[TokenService] Token expired: {ex.Message}");
                return default;
            }
            catch (SecurityTokenInvalidSignatureException ex)
            {
                Console.WriteLine($"[TokenService] Invalid token signature: {ex.Message}");
                return default;
            }
            catch (SecurityTokenInvalidIssuerException ex)
            {
                Console.WriteLine($"[TokenService] Invalid issuer: {ex.Message}");
                return default;
            }
            catch (SecurityTokenInvalidAudienceException ex)
            {
                Console.WriteLine($"[TokenService] Invalid audience: {ex.Message}");
                return default;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[TokenService] Token validation failed: {ex.GetType().Name} - {ex.Message}");
                return default;
            }
        }
    }
}
