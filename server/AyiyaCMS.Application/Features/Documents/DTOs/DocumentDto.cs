// AyiyaCMS.Application/Features/Documents/DTOs/DocumentDto.cs
namespace AyiyaCMS.Application.Features.Documents.DTOs;

public record DocumentDto(
    Guid Id,
    string OriginalFileName,
    string FileKey, 
    string ContentType,
    long FileSizeBytes,
    string Checksum,
    int Version,
    Guid? MatterId,
    string? MatterTitle,
    string? ClientName,
    Guid UploadedById,
    string UploadedByName,
    DateTime UploadedAt
);