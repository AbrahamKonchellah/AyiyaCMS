// AyiyaCMS.Application/Features/Billing/DTOs/GenerateInvoiceRequest.cs
namespace AyiyaCMS.Application.Features.Billing.DTOs;

public record GenerateInvoiceRequest(
    Guid     FeeNoteId,
    DateTime DueDate
);