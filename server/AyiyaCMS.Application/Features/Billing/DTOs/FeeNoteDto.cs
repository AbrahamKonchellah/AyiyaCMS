// AyiyaCMS.Application/Features/Billing/DTOs/FeeNoteDto.cs
namespace AyiyaCMS.Application.Features.Billing.DTOs;

public record FeeNoteDto(
    Guid Id,
    Guid MatterId,
    string MatterTitle,
    string FeeNoteNumber,
    decimal Subtotal,
    decimal VatAmount,
    decimal TotalAmount,
    string Status,
    string GeneratedByName,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    DateTime GeneratedAt
);