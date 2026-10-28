namespace AyiyaCMS.Application.Features.Matters.DTOs;

public record MatterNoteDto(
    string   Id,
    string   MatterId,
    string   AuthorId,
    string   AuthorName,
    string   AuthorRole,
    string   Content,
    string   Visibility,
    string?  ParentNoteId,
    DateTime CreatedAt
);

public record CreateMatterNoteRequest(
    string  Content,
    string  Visibility,   // Internal | Client
    string? ParentNoteId
);