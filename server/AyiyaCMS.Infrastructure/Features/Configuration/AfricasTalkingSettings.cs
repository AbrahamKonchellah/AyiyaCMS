namespace AyiyaCMS.Infrastructure.Configuration;

public class AfricasTalkingSettings
{
    public const string SectionName = "AfricasTalking";

    public string Username { get; set; } = string.Empty;
    public string ApiKey   { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string BaseUrl  { get; set; } = "https://api.sandbox.africastalking.com";
}