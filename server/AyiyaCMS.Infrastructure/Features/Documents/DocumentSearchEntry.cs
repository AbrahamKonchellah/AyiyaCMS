using System.Text.Json.Serialization;

namespace AyiyaCMS.Infrastructure.Features.Documents;

public class DocumentSearchEntry
{
    [JsonPropertyName("id")]               public string Id { get; set; } = string.Empty;
    [JsonPropertyName("originalFileName")] public string OriginalFileName { get; set; } = string.Empty;
    [JsonPropertyName("content")]          public string Content { get; set; } = string.Empty;
    [JsonPropertyName("matterId")]         public string? MatterId { get; set; }
    [JsonPropertyName("matterTitle")]      public string? MatterTitle { get; set; }
    [JsonPropertyName("clientName")]       public string? ClientName { get; set; }
    [JsonPropertyName("contentType")]      public string ContentType { get; set; } = string.Empty;
    [JsonPropertyName("fileSizeBytes")]    public long FileSizeBytes { get; set; }
    [JsonPropertyName("version")]          public int Version { get; set; }
    [JsonPropertyName("uploadedByName")]   public string UploadedByName { get; set; } = string.Empty;
    [JsonPropertyName("uploadedAt")]       public string UploadedAt { get; set; } = string.Empty;

    [JsonPropertyName("_formatted")]
    public DocumentSearchEntry? Formatted { get; set; }
}