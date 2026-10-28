// AyiyaCMS.Infrastructure/Services/GmailSmtpEmailService.cs
using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace AyiyaCMS.Infrastructure.Services;

public class GmailSmtpEmailService : IEmailService
{
    private readonly string _fromEmail;
    private readonly string _appPassword;
    private readonly string _fromName;
    private readonly string _appUrl;

    public GmailSmtpEmailService(IConfiguration config)
    {
        _fromEmail   = config["Gmail:FromEmail"]   ?? "ayiyacms@gmail.com";
        _appPassword = config["Gmail:AppPassword"] ?? string.Empty;
        _fromName    = config["Gmail:FromName"]    ?? "AyiyaCMS";
        _appUrl      = config["App:Url"]           ?? "http://localhost:5173";
    }

    public async Task SendInviteEmailAsync(string toEmail, string toName, string resetToken)
    {
        var resetLink = $"{_appUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";
        var subject   = "Welcome to AyiyaCMS — Set Your Password";
        var html = $"""
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#1C1C1C;">
              <div style="background:#0B2B26;padding:24px 32px;border-radius:6px 6px 0 0;">
                <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#fff;">AyiyaCMS</span>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #E8E4DC;border-top:none;border-radius:0 0 6px 6px;">
                <h2 style="font-family:Georgia,serif;color:#0B2B26;margin:0 0 12px;">Welcome, {toName}.</h2>
                <p style="color:#555;line-height:1.7;margin:0 0 24px;">
                  Your account has been created on <strong>AyiyaCMS</strong>, the law practice management
                  system for your firm. Click the button below to set your password and access your account.
                </p>
                <a href="{resetLink}"
                   style="display:block;background:#D4A853;color:#0B2B26;text-align:center;
                          padding:14px;border-radius:4px;text-decoration:none;
                          font-weight:700;font-size:14px;letter-spacing:0.01em;">
                  Set My Password →
                </a>
                <p style="color:#999;font-size:12px;margin-top:20px;line-height:1.6;">
                  This link expires in <strong>24 hours</strong>. If you did not expect this invitation,
                  you can safely ignore this email or contact your firm administrator.
                </p>
                <hr style="border:none;border-top:1px solid #E8E4DC;margin:24px 0 20px;" />
                <p style="color:#bbb;font-size:11px;margin:0;">
                  If the button above doesn't work, copy and paste this URL into your browser:<br/>
                  <span style="color:#1A5C52;word-break:break-all;">{resetLink}</span>
                </p>
              </div>
            </div>
            """;

        await SendAsync(toEmail, toName, subject, html);
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetToken)
    {
        var resetLink = $"{_appUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";
        var subject   = "AyiyaCMS — Password Reset Request";
        var html = $"""
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#1C1C1C;">
              <div style="background:#0B2B26;padding:24px 32px;border-radius:6px 6px 0 0;">
                <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#fff;">AyiyaCMS</span>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #E8E4DC;border-top:none;border-radius:0 0 6px 6px;">
                <h2 style="font-family:Georgia,serif;color:#0B2B26;margin:0 0 12px;">Password Reset</h2>
                <p style="color:#555;line-height:1.7;margin:0 0 8px;">Dear {toName},</p>
                <p style="color:#555;line-height:1.7;margin:0 0 24px;">
                  An administrator has initiated a password reset for your AyiyaCMS account.
                  Click the button below to set a new password. This link is valid for <strong>24 hours</strong>.
                </p>
                <a href="{resetLink}"
                   style="display:block;background:#D4A853;color:#0B2B26;text-align:center;
                          padding:14px;border-radius:4px;text-decoration:none;
                          font-weight:700;font-size:14px;letter-spacing:0.01em;">
                  Reset My Password →
                </a>
                <p style="color:#999;font-size:12px;margin-top:20px;line-height:1.6;">
                  If you did not request this reset, please contact your firm administrator immediately
                  as your account may have been accessed without authorisation.
                </p>
                <hr style="border:none;border-top:1px solid #E8E4DC;margin:24px 0 20px;" />
                <p style="color:#bbb;font-size:11px;margin:0;">
                  If the button above doesn't work, copy and paste this URL into your browser:<br/>
                  <span style="color:#1A5C52;word-break:break-all;">{resetLink}</span>
                </p>
              </div>
            </div>
            """;

        await SendAsync(toEmail, toName, subject, html);
    }

    private async Task SendAsync(string toEmail, string toName, string subject, string html)
    {
        if (string.IsNullOrEmpty(_appPassword))
        {
            Console.WriteLine($"[EMAIL] To: {toEmail} | Subject: {subject}");
            Console.WriteLine("[EMAIL] (Gmail not configured — email not sent)");
            return;
        }

        using var message = new MailMessage
        {
            From       = new MailAddress(_fromEmail, _fromName),
            Subject    = subject,
            Body       = html,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(toEmail, toName));

        using var client = new SmtpClient("smtp.gmail.com", 587)
        {
            Credentials      = new NetworkCredential(_fromEmail, _appPassword),
            EnableSsl        = true,
            DeliveryMethod   = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
        };

        await client.SendMailAsync(message);
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
      await SendAsync(toEmail, toEmail, subject, htmlBody);
    }
}