// AyiyaCMS.Infrastructure/Services/IEmailService.cs
namespace AyiyaCMS.Infrastructure.Services;

public interface IEmailService
{
    Task SendInviteEmailAsync(string toEmail, string toName, string tempPassword);
    Task SendPasswordResetEmailAsync(string toEmail, string toName, string tempPassword);
    Task SendEmailAsync(string toEmail, string subject, string htmlBody);
}