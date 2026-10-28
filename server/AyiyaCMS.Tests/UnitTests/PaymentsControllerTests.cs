using System.Text;
using Amazon.S3;
using AyiyaCMS.API.Controllers;
using AyiyaCMS.Application.Features.Payments.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Configuration;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Features.Billing;
using AyiyaCMS.Infrastructure.Features.Payments;
using AyiyaCMS.Infrastructure.Services;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using FluentAssertions;
using Moq;

namespace AyiyaCMS.Tests.IntegrationTests;

public class PaymentsControllerTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly InvoiceCommand _invoiceCommand;
    private readonly Mock<IMpesaService> _mpesaMock = new();

    public PaymentsControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        var s3 = new S3StorageService(Mock.Of<IAmazonS3>(), "test-bucket");
        var config = new ConfigurationBuilder().Build();
        var firm = Options.Create(new FirmSettings());
        var audit = new AuditService(_db);

        _invoiceCommand = new InvoiceCommand(_db, s3, config, firm, audit);
    }

    public void Dispose() => _db.Dispose();

    private PaymentsController BuildController()
    {
        var controller = new PaymentsController(
            _mpesaMock.Object, _db, _invoiceCommand, NullLogger<PaymentsController>.Instance);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return controller;
    }

    private static void SetRequestBody(PaymentsController controller, string json) =>
        controller.ControllerContext.HttpContext.Request.Body =
            new MemoryStream(Encoding.UTF8.GetBytes(json));

    private async Task<(Client client, Matter matter, Invoice invoice)> SeedInvoiceAsync(
        string status = "Sent", string? checkoutRequestId = null, string phone = "0712345678")
    {
        var client = new Client { Id = Guid.NewGuid(), Name = "Test Client", Email = "c@test.com", Phone = phone };
        var matter = new Matter { Id = Guid.NewGuid(), Title = "Test Matter", ClientId = client.Id, Status = "Active" };
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            ClientId = client.Id,
            MatterId = matter.Id,
            InvoiceNumber = "INV-2026-0001",
            Amount = 15000m,
            IssuedAt = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            Status = status,
            MpesaCheckoutRequestId = checkoutRequestId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Clients.Add(client);
        _db.Matters.Add(matter);
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();

        return (client, matter, invoice);
    }

    // ---------- InitiateMpesaPayment ----------

    [Fact]
    public async Task InitiateMpesaPayment_InvoiceNotFound_ReturnsNotFound()
    {
        var controller = BuildController();

        var result = await controller.InitiateMpesaPayment(new InitiateStkPushRequest(Guid.NewGuid()));

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task InitiateMpesaPayment_AlreadyPaidInvoice_ReturnsBadRequest()
    {
        var (_, _, invoice) = await SeedInvoiceAsync(status: "Paid");
        var controller = BuildController();

        var result = await controller.InitiateMpesaPayment(new InitiateStkPushRequest(invoice.Id));

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task InitiateMpesaPayment_NoClientPhone_ReturnsBadRequest()
    {
        var (_, _, invoice) = await SeedInvoiceAsync(phone: " ");
        var controller = BuildController();

        var result = await controller.InitiateMpesaPayment(new InitiateStkPushRequest(invoice.Id));

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task InitiateMpesaPayment_Success_StoresCheckoutRequestId()
    {
        var (_, _, invoice) = await SeedInvoiceAsync();
        _mpesaMock.Setup(m => m.InitiateStkPushAsync(
                It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new InitiateStkPushResult(true, "ws_CO_999", "mr_999", null));

        var controller = BuildController();
        var result = await controller.InitiateMpesaPayment(new InitiateStkPushRequest(invoice.Id));

        result.Should().BeOfType<OkObjectResult>();
        var updated = await _db.Invoices.FindAsync(invoice.Id);
        updated!.MpesaCheckoutRequestId.Should().Be("ws_CO_999");
    }

    // ---------- MpesaCallback ----------

    [Fact]
    public async Task MpesaCallback_SuccessfulPayment_MarksInvoicePaidWithReceiptNumber()
    {
        var (_, _, invoice) = await SeedInvoiceAsync(checkoutRequestId: "ws_CO_match");
        var controller = BuildController();
        var payload = $$"""
        {
          "Body": {
            "stkCallback": {
              "MerchantRequestID": "mr_1",
              "CheckoutRequestID": "ws_CO_match",
              "ResultCode": 0,
              "ResultDesc": "The service request is processed successfully.",
              "CallbackMetadata": {
                "Item": [
                  { "Name": "Amount", "Value": 15000 },
                  { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
                  { "Name": "PhoneNumber", "Value": 254712345678 }
                ]
              }
            }
          }
        }
        """;
        SetRequestBody(controller, payload);

        var result = await controller.MpesaCallback();

        result.Should().BeOfType<OkResult>();
        var updated = await _db.Invoices.FindAsync(invoice.Id);
        updated!.Status.Should().Be("Paid");
        updated.MpesaReceiptNumber.Should().Be("NLJ7RT61SV");
    }

    [Fact]
    public async Task MpesaCallback_NonZeroResultCode_DoesNotMarkPaid()
    {
        var (_, _, invoice) = await SeedInvoiceAsync(checkoutRequestId: "ws_CO_cancel");
        var controller = BuildController();
        var payload = """
        {
          "Body": {
            "stkCallback": {
              "MerchantRequestID": "mr_2",
              "CheckoutRequestID": "ws_CO_cancel",
              "ResultCode": 1032,
              "ResultDesc": "Request cancelled by user."
            }
          }
        }
        """;
        SetRequestBody(controller, payload);

        var result = await controller.MpesaCallback();

        result.Should().BeOfType<OkResult>();
        var updated = await _db.Invoices.FindAsync(invoice.Id);
        updated!.Status.Should().Be("Sent");
    }

    [Fact]
    public async Task MpesaCallback_UnmatchedCheckoutRequestId_ReturnsOkAndDoesNotThrow()
    {
        await SeedInvoiceAsync(checkoutRequestId: "ws_CO_real");
        var controller = BuildController();
        var payload = """
        {
          "Body": {
            "stkCallback": {
              "MerchantRequestID": "mr_3",
              "CheckoutRequestID": "ws_CO_does_not_exist",
              "ResultCode": 0,
              "ResultDesc": "The service request is processed successfully.",
              "CallbackMetadata": { "Item": [ { "Name": "MpesaReceiptNumber", "Value": "ABC123" } ] }
            }
          }
        }
        """;
        SetRequestBody(controller, payload);

        var result = await controller.MpesaCallback();

        result.Should().BeOfType<OkResult>();
    }

    [Fact]
    public async Task MpesaCallback_MalformedJson_ReturnsOk()
    {
        var controller = BuildController();
        SetRequestBody(controller, "{ this is not valid json");

        var result = await controller.MpesaCallback();

        result.Should().BeOfType<OkResult>();
    }
}