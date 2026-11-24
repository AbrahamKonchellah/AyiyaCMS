// AyiyaCMS.Infrastructure/Services/MlClient.cs
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace AyiyaCMS.Infrastructure.Services;

/// <summary>
/// Talks to the Python clause-analysis service (ml-service/). The response is passed
/// through as raw JSON so the React page receives exactly what the model produced.
/// </summary>
public class MlClient
{
    private readonly HttpClient _http;

    public MlClient(HttpClient http, IConfiguration config)
    {
        _http = http;
        _http.BaseAddress = new Uri(config["MlService:BaseUrl"] ?? "http://127.0.0.1:8000");
        _http.Timeout = TimeSpan.FromSeconds(60);
    }

    public async Task<JsonElement> AnalyzeAsync(
        string text, DateOnly? referenceDate, CancellationToken ct = default)
    {
        var payload = new
        {
            text,
            reference_date = referenceDate?.ToString("yyyy-MM-dd"),
        };

        using var response = await _http.PostAsJsonAsync("/analyze", payload, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
    }

    public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
    {
        try
        {
            using var response = await _http.GetAsync("/health", ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
