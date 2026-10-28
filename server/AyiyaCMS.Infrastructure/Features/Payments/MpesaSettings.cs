namespace AyiyaCMS.Infrastructure.Features.Payments;

public class MpesaSettings
{
    public const string SectionName = "Mpesa";

    public string ConsumerKey { get; set; } = string.Empty;
    public string ConsumerSecret { get; set; } = string.Empty;
    public string Shortcode { get; set; } = string.Empty;
    public string Passkey { get; set; } = string.Empty;
    public string CallbackUrl { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://sandbox.safaricom.co.ke";

    // When set, all STK pushes go to this number instead of the client's phone.
    // Use for demos/testing. Leave empty in production.
    public string? DemoPhoneOverride { get; set; }
}