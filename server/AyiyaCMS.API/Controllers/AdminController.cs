// AyiyaCMS.API/Controllers/AdminController.cs
using System.Security.Claims;
using AyiyaCMS.Application.Features.Admin.DTOs;
using AyiyaCMS.Infrastructure.Features.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly UserManagementCommand _userMgmt;

    public AdminController(UserManagementCommand userMgmt)
    {
        _userMgmt = userMgmt;
    }

    private string PerformedBy =>
        User.FindFirst(ClaimTypes.Name)?.Value ??
        User.FindFirst(ClaimTypes.Email)?.Value ??
        "Unknown";

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userMgmt.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpPost("users/invite")]
    public async Task<IActionResult> InviteUser([FromBody] InviteUserRequest request)
    {
        var (success, message) = await _userMgmt.InviteUserAsync(request, PerformedBy);
        if (!success) return Conflict(new { message });
        return Ok(new { message });
    }

    [HttpPatch("users/{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
    {
        var validRoles = new[] { "Admin", "Partner", "Associate", "Paralegal", "Client", "Auditor" };
        if (!validRoles.Contains(request.Role))
            return BadRequest(new { message = "Invalid role." });

        var success = await _userMgmt.UpdateRoleAsync(id, request.Role, PerformedBy);
        if (!success) return NotFound(new { message = "User not found." });
        return Ok(new { message = "Role updated successfully." });
    }

    [HttpPatch("users/{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateUser(Guid id)
    {
        var success = await _userMgmt.DeactivateUserAsync(id, PerformedBy);
        if (!success) return NotFound(new { message = "User not found." });
        return Ok(new { message = "User deactivated." });
    }

    [HttpPatch("users/{id:guid}/reactivate")]
    public async Task<IActionResult> ReactivateUser(Guid id)
    {
        var success = await _userMgmt.ReactivateUserAsync(id, PerformedBy);
        if (!success) return NotFound(new { message = "User reactivated." });
        return Ok(new { message = "User reactivated." });
    }

    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        var (success, message) = await _userMgmt.ResetPasswordAsync(id, PerformedBy);
        if (!success) return NotFound(new { message });
        return Ok(new { message });
    }
}