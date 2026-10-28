// AyiyaCMS.Infrastructure/Services/AfricasTalkingSmsService.cs
using AyiyaCMS.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;

namespace AyiyaCMS.Infrastructure.Services;

public interface ISmsService
{
    Task<bool> SendSmsAsync(string phoneNumber, string message);
}

public class AfricasTalkingSmsService : ISmsService
{
    private readonly HttpClient _http;
    private readonly AfricasTalkingSettings _settings;
    private readonly ILogger<AfricasTalkingSmsService> _logger;

    public AfricasTalkingSmsService(
        HttpClient http,
        IOptions<AfricasTalkingSettings> settings,
        ILogger<AfricasTalkingSmsService> logger)
    {
        _http     = http;
        _settings = settings.Value;
        _logger   = logger;
    }

    public async Task<bool> SendSmsAsync(string phoneNumber, string message)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            _logger.LogWarning("[SMS] Africa's Talking not configured. Message to {Phone}: {Message}",
                phoneNumber, message);
            return false;
        }

        try
        {
            var normalized = NormalizePhone(phoneNumber);
            if (normalized == null)
            {
                _logger.LogWarning("[SMS] Could not normalize phone number: {Phone}", phoneNumber);
                return false;
            }

            var formData = new List<KeyValuePair<string, string>>
            {
                new("username", _settings.Username),
                new("to",       normalized),
                new("message",  message),
            };

            if (!string.IsNullOrWhiteSpace(_settings.SenderId))
                formData.Add(new("from", _settings.SenderId));

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{_settings.BaseUrl}/version1/messaging")
            {
                Content = new FormUrlEncodedContent(formData),
            };
            request.Headers.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));
            request.Headers.Add("apiKey", _settings.ApiKey);

            var response = await _http.SendAsync(request);
            var body     = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[SMS] Africa's Talking error: {Status} {Body}",
                    response.StatusCode, body);
                return false;
            }

            _logger.LogInformation("[SMS] Sent to {Phone}: {Body}", normalized, body);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMS] Failed to send SMS to {Phone}", phoneNumber);
            return false;
        }
    }

    // Normalize to +254XXXXXXXXX
    private static string? NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("254") && digits.Length == 12) return $"+{digits}";
        if (digits.StartsWith("0")   && digits.Length == 10) return $"+254{digits[1..]}";
        if (digits.StartsWith("7")   && digits.Length == 9)  return $"+254{digits}";
        if (digits.StartsWith("1")   && digits.Length == 9)  return $"+254{digits}";
        return null;
    }
}