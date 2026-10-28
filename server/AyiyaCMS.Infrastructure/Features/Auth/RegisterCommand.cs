// AyiyaCMS.Infrastructure/Features/Auth/RegisterCommand.cs
using AyiyaCMS.Application.Features.Auth.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Auth;

public class RegisterCommand
{
    private readonly AppDbContext _db;

    public RegisterCommand(AppDbContext db) => _db = db;

    public async Task<bool> ExecuteAsync(RegisterRequest request)
    {
        bool exists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (exists) return false;

        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            IsActive = true
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return true;
    }
}