using System.Net;
using System.Text;
using System.Text.Json;
using AyiyaCMS.Infrastructure.Features.Payments;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using FluentAssertions;
namespace AyiyaCMS.Tests.UnitTests;

/// <summary>
/// Routes fake HTTP responses based on the request path, and records the
/// last request body sent — used to inspect the outgoing STK Push payload
/// (e.g. to verify phone number normalization) without a live Daraja sandbox.
/// </summary>
public class FakeMpesaHttpHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;
    public string? LastRequestBody { get; private set; }

    public FakeMpesaHttpHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        => _responder = responder;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.Content != null)
            LastRequestBody = await request.Content.ReadAsStringAsync(cancellationToken);

        return _responder(request);
    }
}

public class MpesaServiceTests
{
    private static HttpResponseMessage JsonResponse(HttpStatusCode status, object body) =>
        new(status) { Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json") };

    private static (MpesaService service, FakeMpesaHttpHandler handler) BuildService(
        Func<HttpRequestMessage, HttpResponseMessage> stkResponder, string? demoPhoneOverride = null)
    {
        var handler = new FakeMpesaHttpHandler(request =>
        {
            if (request.RequestUri!.AbsolutePath.Contains("oauth/v1/generate"))
                return JsonResponse(HttpStatusCode.OK, new { access_token = "fake-token" });

            return stkResponder(request);
        });

        var httpClient = new HttpClient(handler);
        var settings = new MpesaSettings
        {
            ConsumerKey = "key",
            ConsumerSecret = "secret",
            Shortcode = "174379",
            Passkey = "passkey",
            CallbackUrl = "https://example.com/api/payments/mpesa/callback",
            BaseUrl = "https://sandbox.safaricom.co.ke",
            DemoPhoneOverride = demoPhoneOverride,
        };

        var service = new MpesaService(httpClient, Options.Create(settings), NullLogger<MpesaService>.Instance);
        return (service, handler);
    }

    [Fact]
    public async Task InitiateStkPushAsync_Success_ReturnsCheckoutRequestId()
    {
        var (service, _) = BuildService(_ => JsonResponse(HttpStatusCode.OK, new
        {
            ResponseCode = "0",
            CheckoutRequestID = "ws_CO_123",
            MerchantRequestID = "mr_123",
        }));

        var result = await service.InitiateStkPushAsync("0712345678", 1500m, "INV-2026-0001", "Invoice payment");

        result.Success.Should().BeTrue();
        result.CheckoutRequestId.Should().Be("ws_CO_123");
        result.MerchantRequestId.Should().Be("mr_123");
        result.ErrorMessage.Should().BeNull();
    }

    [Fact]
    public async Task InitiateStkPushAsync_DarajaRejects_ReturnsFailureWithDescription()
    {
        var (service, _) = BuildService(_ => JsonResponse(HttpStatusCode.OK, new
        {
            ResponseCode = "1",
            ResponseDescription = "Invalid PartyA number",
            CheckoutRequestID = "ws_CO_456",
            MerchantRequestID = "mr_456",
        }));

        var result = await service.InitiateStkPushAsync("0712345678", 1500m, "INV-2026-0002", "Invoice payment");

        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Invalid PartyA number");
    }

    [Fact]
    public async Task InitiateStkPushAsync_HttpFailure_ReturnsFailure()
    {
        var (service, _) = BuildService(_ =>
            new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent("Daraja is down")
            });

        var result = await service.InitiateStkPushAsync("0712345678", 1500m, "INV-2026-0003", "Invoice payment");

        result.Success.Should().BeFalse();
        result.CheckoutRequestId.Should().BeNull();
    }

    [Theory]
    [InlineData("0712345678", "254712345678")]
    [InlineData("254712345678", "254712345678")]
    [InlineData("712345678", "254712345678")]
    [InlineData("0712 345 678", "254712345678")]
    public async Task InitiateStkPushAsync_NormalizesPhoneNumber(string input, string expected)
    {
        var (service, handler) = BuildService(_ => JsonResponse(HttpStatusCode.OK, new
        {
            ResponseCode = "0",
            CheckoutRequestID = "ws_CO_789",
            MerchantRequestID = "mr_789",
        }));

        await service.InitiateStkPushAsync(input, 1000m, "INV-2026-0004", "Invoice payment");

        handler.LastRequestBody.Should().NotBeNull();
        using var doc = JsonDocument.Parse(handler.LastRequestBody!);
        doc.RootElement.GetProperty("PhoneNumber").GetString().Should().Be(expected);
    }
}