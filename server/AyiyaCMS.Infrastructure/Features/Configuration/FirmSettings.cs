// AyiyaCMS.Infrastructure/Configuration/FirmSettings.cs
namespace AyiyaCMS.Infrastructure.Configuration;

public class FirmSettings
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string VatPin { get; set; } = string.Empty;
    public decimal VatRate { get; set; } = 0.16m;
}