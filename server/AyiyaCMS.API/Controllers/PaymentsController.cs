// API/Controllers/PaymentsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AyiyaCMS.Application.Features.Payments.DTOs;
using AyiyaCMS.Infrastructure.Features.Payments;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Features.Billing;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AyiyaCMS.API.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IMpesaService _mpesaService;
    private readonly AppDbContext _db;
    private readonly InvoiceCommand _invoiceCommand;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IMpesaService mpesaService,
        AppDbContext db,
        InvoiceCommand invoiceCommand,
        ILogger<PaymentsController> logger)
    {
        _mpesaService = mpesaService;
        _db = db;
        _invoiceCommand = invoiceCommand;
        _logger = logger;
    }

    /// <summary>
    /// Initiates an STK Push for the given invoice. Looks up amount + client phone.
    /// </summary>
    [HttpPost("mpesa/initiate")]
    [Authorize] // tighten to ClientOnly or PartnerOrAdmin per your policy needs
    public async Task<IActionResult> InitiateMpesaPayment([FromBody] InitiateStkPushRequest request)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Client)
            .FirstOrDefaultAsync(i => i.Id == request.InvoiceId);

        if (invoice is null)
            return NotFound(new { message = "Invoice not found." });

        if (invoice.Status == "Paid")
            return BadRequest(new { message = "Invoice is already paid." });

        var phone = invoice.Client?.Phone;
        if (string.IsNullOrWhiteSpace(phone))
            return BadRequest(new { message = "Client has no phone number on file." });

        var result = await _mpesaService.InitiateStkPushAsync(
            phoneNumber: phone,
            amount: invoice.Amount,
            accountReference: invoice.InvoiceNumber, // e.g. INV-2026-0001
            transactionDesc: $"Payment for {invoice.InvoiceNumber}"
        );

        if (!result.Success)
        {
            _logger.LogWarning("STK Push failed for invoice {InvoiceId}: {Error}",
                invoice.Id, result.ErrorMessage);
            return BadRequest(new { message = result.ErrorMessage ?? "Failed to initiate payment." });
        }

        // Store CheckoutRequestID against the invoice so the callback can match it back.
        // Requires Invoice.MpesaCheckoutRequestId (string?) — add via migration if not present yet.
        invoice.MpesaCheckoutRequestId = result.CheckoutRequestId;
        invoice.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "STK Push sent. Awaiting customer confirmation.",
            checkoutRequestId = result.CheckoutRequestId
        });
    }

    /// <summary>
    /// Daraja webhook. Must always return HTTP 200 or Safaricom retries aggressively.
    /// </summary>
    [HttpPost("mpesa/callback")]
    [AllowAnonymous] // Safaricom can't authenticate — this endpoint must stay open
    public async Task<IActionResult> MpesaCallback()
    {
        try
        {
            using var reader = new StreamReader(Request.Body);
            var rawBody = await reader.ReadToEndAsync();
            _logger.LogInformation("M-Pesa callback received: {Body}", rawBody);

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var envelope = JsonSerializer.Deserialize<MpesaCallbackEnvelope>(rawBody, options);
            var callback = envelope?.Body?.stkCallback;

            if (callback is null)
            {
                _logger.LogWarning("M-Pesa callback body could not be parsed: {Body}", rawBody);
                return Ok(); // still 200 — malformed payload isn't Safaricom's problem to retry
            }

            if (callback.ResultCode != 0)
            {
                _logger.LogInformation("M-Pesa payment not completed. CheckoutRequestID={Id}, ResultDesc={Desc}",
                    callback.CheckoutRequestID, callback.ResultDesc);
                return Ok();
            }

            // Extract MpesaReceiptNumber from CallbackMetadata.Item
            var receiptItem = callback.CallbackMetadata?.Item
                .FirstOrDefault(i => i.Name == "MpesaReceiptNumber");
            var mpesaReceiptNumber = receiptItem?.Value?.ToString();

            var invoice = await _db.Invoices
                .FirstOrDefaultAsync(i => i.MpesaCheckoutRequestId == callback.CheckoutRequestID);

            if (invoice is null)
            {
                _logger.LogWarning("No invoice found for CheckoutRequestID {Id}", callback.CheckoutRequestID);
                return Ok();
            }

            if (string.IsNullOrEmpty(mpesaReceiptNumber))
            {
                _logger.LogWarning("M-Pesa callback succeeded but no receipt number found for invoice {InvoiceId}",
                    invoice.Id);
                return Ok();
            }

            // InvoiceCommand.MarkPaidAsync already accepts (Guid invoiceId, string? mpesaReceiptNumber = null)
            await _invoiceCommand.MarkPaidAsync(invoice.Id, mpesaReceiptNumber);

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing M-Pesa callback");
            return Ok(); // ALWAYS 200 — never let Safaricom see a 500, it triggers retries that won't help
        }
    }
}