// AyiyaCMS.Application/Features/Documents/DTOs/UploadDocumentRequest.cs
namespace AyiyaCMS.Application.Features.Documents.DTOs;

public record UploadDocumentRequest(
    Guid MatterId,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string FileKey,
    string BucketName,
    string Checksum,
    int Version
);