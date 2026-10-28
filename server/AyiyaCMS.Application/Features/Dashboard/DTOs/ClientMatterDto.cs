// AyiyaCMS.Application/Features/Dashboard/DTOs/ClientMatterDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class ClientMatterDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string JICMSCaseNumber { get; set; } = string.Empty;
    public string CourtStation { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? HearingDate { get; set; }
    public DateTime? FilingDeadline { get; set; }
    public string? AssignedLawyerName { get; set; }
}
public record ClientDocumentDto
{
    public string Id { get; init; } = string.Empty;
    public string OriginalFileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public long FileSizeBytes { get; init; }
    public int Version { get; init; }
    public DateTime UploadedAt { get; init; }
}