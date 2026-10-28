// AyiyaCMS.Application/Features/Billing/DTOs/InvoiceDto.cs
namespace AyiyaCMS.Application.Features.Billing.DTOs;

public record InvoiceDto(
    Guid     Id,
    Guid     ClientId,
    string   ClientName,
    Guid?    MatterId,
    string?  MatterTitle,
    Guid?    FeeNoteId,
    string?  FeeNoteNumber,
    string   InvoiceNumber,
    decimal  Amount,
    DateTime IssuedAt,
    DateTime DueDate,
    string   Status,
    string   CreatedByName,
    string?  SentByName,
    DateTime? SentAt,
    DateTime? PaidAt,
    string?  MpesaReceiptNumber
);