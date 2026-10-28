// AyiyaCMS.Application/Features/Dashboard/DTOs/ClientInvoiceDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class ClientInvoiceDto
{
    public string Id { get; set; } = string.Empty;
    public string MatterTitle { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime IssuedAt { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
}