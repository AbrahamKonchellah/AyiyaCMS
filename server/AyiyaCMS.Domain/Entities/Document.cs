// AyiyaCMS.Domain/Entities/Document.cs
using System;

namespace AyiyaCMS.Domain.Entities
{
    public class Document
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileKey { get; set; } = string.Empty;       // S3 path
        public string ContentType { get; set; } = string.Empty;
        public string BucketName { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }                    // file size
        public string Checksum { get; set; } = string.Empty;      // SHA-256 hash
        public int Version { get; set; } = 1;                     // version number
        public string OriginalFileName { get; set; } = string.Empty; // display name

        // Relationships
        public Guid UploadedById { get; set; }
        public User? UploadedBy { get; set; }
        public Guid? MatterId { get; set; }
        public Matter? Matter { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}