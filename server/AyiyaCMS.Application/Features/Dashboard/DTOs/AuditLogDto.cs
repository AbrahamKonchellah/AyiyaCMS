// AyiyaCMS.Application/Features/Dashboard/DTOs/AuditLogDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class AuditLogDto
{
    public string Id { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime PerformedAt { get; set; }
    public string Changes { get; set; } = string.Empty;
}