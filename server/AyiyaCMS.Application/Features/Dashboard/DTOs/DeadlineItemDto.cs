// AyiyaCMS.Application/Features/Dashboard/DTOs/DeadlineItemDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class DeadlineItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Matter { get; set; } = string.Empty;
    public DateTime Date { get; set; }
}