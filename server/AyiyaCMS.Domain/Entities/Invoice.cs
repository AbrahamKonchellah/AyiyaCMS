// AyiyaCMS.Domain/Entities/Invoice.cs
using System;

namespace AyiyaCMS.Domain.Entities
{
    public class Invoice
    {
        public Guid Id { get; set; }
        public Guid ClientId { get; set; }
        public Client? Client { get; set; }
        public Guid? MatterId { get; set; }
        public Matter? Matter { get; set; }
        public Guid? FeeNoteId { get; set; }
        public FeeNote? FeeNote { get; set; }

        public string InvoiceNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public DateTime DueDate { get; set; } = DateTime.UtcNow;

        // Draft, Sent, Paid, Overdue
        public string Status { get; set; } = "Draft";

        public Guid CreatedById { get; set; }
        public User? CreatedBy { get; set; }
        public Guid? SentById { get; set; }
        public User? SentBy { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime? PaidAt { get; set; }

        public string? MpesaReceiptNumber { get; set; }

        // M-Pesa STK Push CheckoutRequestID, stored at initiate-time so the
        // async Daraja callback can be matched back to this invoice.
        public string? MpesaCheckoutRequestId { get; set; }

        public string FileKey { get; set; } = string.Empty;
        public string BucketName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}