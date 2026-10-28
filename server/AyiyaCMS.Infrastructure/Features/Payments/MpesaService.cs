// Infrastructure/Features/Payments/MpesaService.cs

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using AyiyaCMS.Application.Features.Payments.DTOs;
using Microsoft.Extensions.Logging;

namespace AyiyaCMS.Infrastructure.Features.Payments;

public interface IMpesaService
{
    Task<InitiateStkPushResult> InitiateStkPushAsync(
        string phoneNumber, decimal amount, string accountReference, string transactionDesc);
}

public class MpesaService : IMpesaService
{
    private readonly HttpClient _http;
    private readonly MpesaSettings _settings;
    private readonly ILogger<MpesaService> _logger;

    public MpesaService(HttpClient http, IOptions<MpesaSettings> settings, ILogger<MpesaService> logger)
    {
        _http = http;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<InitiateStkPushResult> InitiateStkPushAsync(
        string phoneNumber, decimal amount, string accountReference, string transactionDesc)
    {
        try
        {
            var token = await GetAccessTokenAsync();
            var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
            var password = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{_settings.Shortcode}{_settings.Passkey}{timestamp}"));

            var rawPhone = !string.IsNullOrWhiteSpace(_settings.DemoPhoneOverride)
                  ? _settings.DemoPhoneOverride
                  : phoneNumber;
             var normalizedPhone = NormalizePhoneNumber(rawPhone);

            var requestBody = new
            {
                BusinessShortCode = _settings.Shortcode,
                Password = password,
                Timestamp = timestamp,
                TransactionType = "CustomerPayBillOnline",
                Amount = (int)Math.Round(amount), // Daraja sandbox rejects decimals
                PartyA = normalizedPhone,
                PartyB = _settings.Shortcode,
                PhoneNumber = normalizedPhone,
                CallBackURL = _settings.CallbackUrl,
                AccountReference = accountReference,
                TransactionDesc = transactionDesc
            };

            var request = new HttpRequestMessage(HttpMethod.Post,
                $"{_settings.BaseUrl}/mpesa/stkpush/v1/processrequest")
            {
                Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _http.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Daraja STK Push failed: {Status} {Body}", response.StatusCode, responseBody);
                return new InitiateStkPushResult(false, null, null, $"Daraja error: {responseBody}");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            // ResponseCode "0" means accepted for processing (not yet paid)
            var responseCode = root.TryGetProperty("ResponseCode", out var rc) ? rc.GetString() : null;
            var checkoutRequestId = root.TryGetProperty("CheckoutRequestID", out var cr) ? cr.GetString() : null;
            var merchantRequestId = root.TryGetProperty("MerchantRequestID", out var mr) ? mr.GetString() : null;

            if (responseCode != "0")
            {
                var desc = root.TryGetProperty("ResponseDescription", out var rd) ? rd.GetString() : "Unknown error";
                return new InitiateStkPushResult(false, checkoutRequestId, merchantRequestId, desc);
            }

            return new InitiateStkPushResult(true, checkoutRequestId, merchantRequestId, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating M-Pesa STK Push");
            return new InitiateStkPushResult(false, null, null, "Unexpected error initiating payment");
        }
    }

    private async Task<string> GetAccessTokenAsync()
    {
        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_settings.ConsumerKey}:{_settings.ConsumerSecret}"));

        var request = new HttpRequestMessage(HttpMethod.Get,
            $"{_settings.BaseUrl}/oauth/v1/generate?grant_type=client_credentials");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("Daraja did not return an access_token");
    }

    // Daraja sandbox expects 2547XXXXXXXX format — normalize from 07.., +254.., 254..
    private static string NormalizePhoneNumber(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("254") && digits.Length == 12)
            return digits;
        if (digits.StartsWith("0") && digits.Length == 10)
            return "254" + digits[1..];
        if (digits.StartsWith("7") && digits.Length == 9)
            return "254" + digits;

        return digits; // fall through — let Daraja reject if still malformed
    }
}