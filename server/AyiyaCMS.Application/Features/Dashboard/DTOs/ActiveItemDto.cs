// AyiyaCMS.Application/Features/Dashboard/DTOs/ActivityItemDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class ActivityItemDto
{
    public string Id { get; set; } = string.Empty;

    /// <summary>doc | note | user | bill | alert</summary>
    public string Type { get; set; } = string.Empty;

    public string Text { get; set; } = string.Empty;
    public string? Matter { get; set; }
    public DateTime Time { get; set; }
}