namespace AyiyaCMS.Domain.Entities;

public class MatterNote
{
    public Guid   Id           { get; set; }
    public Guid   MatterId     { get; set; }
    public Matter? Matter      { get; set; }

    public Guid   AuthorId     { get; set; }
    public User?  Author       { get; set; }
    public string AuthorName   { get; set; } = string.Empty;
    public string AuthorRole   { get; set; } = string.Empty; // Staff | Client

    public string Content      { get; set; } = string.Empty;

    // Internal = staff only, Client = visible to client too
    public string Visibility   { get; set; } = "Internal";

    // Optional — reply to another note
    public Guid?  ParentNoteId { get; set; }

    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt  { get; set; } = DateTime.UtcNow;
}