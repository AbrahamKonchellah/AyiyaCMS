// AyiyaCMS.Domain/Entities/User.cs
using System;

namespace AyiyaCMS.Domain.Entities
{
    public class User
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}".Trim();
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Associate";
        public bool IsActive { get; set; } = true;
        public string? Phone { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public bool MustChangePassword { get; set; } = false;

        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }

        public bool MfaEnabled { get; set; } = false;
        public string? MfaSecret { get; set; }

        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }
    }
}