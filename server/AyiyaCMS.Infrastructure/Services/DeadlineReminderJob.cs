// AyiyaCMS.Infrastructure/Services/DeadlineReminderJob.cs
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AyiyaCMS.Infrastructure.Services;

public class DeadlineReminderJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DeadlineReminderJob> _logger;

    // Run once per day — check at 07:00 EAT (04:00 UTC)
    private static readonly TimeOnly _runAt = new(4, 0, 0);

    public DeadlineReminderJob(
        IServiceScopeFactory scopeFactory,
        ILogger<DeadlineReminderJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[ReminderJob] Deadline reminder job started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = CalculateDelay();
            _logger.LogInformation("[ReminderJob] Next run in {Minutes} minutes.", (int)delay.TotalMinutes);

            await Task.Delay(delay, stoppingToken);

            if (!stoppingToken.IsCancellationRequested)
                await RunAsync(stoppingToken);
        }
    }

    private static TimeSpan CalculateDelay()
    {
        var now     = DateTime.UtcNow;
        var todayRun = DateTime.UtcNow.Date.Add(_runAt.ToTimeSpan());
        var next    = now < todayRun ? todayRun : todayRun.AddDays(1);
        return next - now;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("[ReminderJob] Running deadline reminder check at {Time}", DateTime.UtcNow);

        using var scope   = _scopeFactory.CreateScope();
        var db            = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email         = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var sms           = scope.ServiceProvider.GetRequiredService<ISmsService>();
        var audit         = scope.ServiceProvider.GetRequiredService<AuditService>();

        var now           = DateTime.UtcNow.Date;
        var checkDays     = new[] { 1, 3, 7 };
        var targetDates   = checkDays.Select(d => now.AddDays(d)).ToHashSet();

        // ── Load matters with upcoming deadlines ──────
        var matters = await db.Matters
            .Include(m => m.Client)
            .Include(m => m.AssignedLawyer)
            .Where(m => m.Status == "Active" && (
                (m.HearingDate.HasValue    && targetDates.Contains(m.HearingDate.Value.Date)) ||
                (m.FilingDeadline.HasValue && targetDates.Contains(m.FilingDeadline.Value.Date))
            ))
            .ToListAsync(ct);

        _logger.LogInformation("[ReminderJob] Found {Count} matters with upcoming deadlines.", matters.Count);

        foreach (var matter in matters)
        {
            // ── Hearing reminders ─────────────────────
            if (matter.HearingDate.HasValue &&
                targetDates.Contains(matter.HearingDate.Value.Date))
            {
                var daysUntil = (matter.HearingDate.Value.Date - now).Days;
                await SendRemindersAsync(
                    matter.Id.ToString(), matter.Title,
                    matter.Client?.Name ?? "Unknown",
                    matter.CourtStation ?? "Unknown Court",
                    "Hearing", matter.HearingDate.Value,
                    matter.AssignedLawyer, matter.Client?.Email,
                    email, sms, audit, ct);
            }

            // ── Filing deadline reminders ─────────────
            if (matter.FilingDeadline.HasValue &&
                targetDates.Contains(matter.FilingDeadline.Value.Date))
            {
                var daysUntil = (matter.FilingDeadline.Value.Date - now).Days;
                await SendRemindersAsync(
                    matter.Id.ToString(), matter.Title,
                    matter.Client?.Name ?? "Unknown",
                    matter.CourtStation ?? "Unknown Court",
                    "Filing Deadline", matter.FilingDeadline.Value,
                    matter.AssignedLawyer, matter.Client?.Email,
                    email, sms, audit, ct);
            }
        }

        _logger.LogInformation("[ReminderJob] Reminder run complete.");
    }

    private async Task SendRemindersAsync(
        string matterId, string matterTitle, string clientName,
        string courtStation, string deadlineType, DateTime deadlineDate,
        AyiyaCMS.Domain.Entities.User? lawyer, string? clientEmail,
        IEmailService emailSvc, ISmsService smsSvc, AuditService audit,
        CancellationToken ct)
    {
        var daysUntil = (deadlineDate.Date - DateTime.UtcNow.Date).Days;
        var urgency   = daysUntil == 1 ? "TOMORROW" : $"in {daysUntil} days";
        var dateStr   = deadlineDate.ToString("dddd, d MMMM yyyy");
        var timeStr   = deadlineDate.ToString("HH:mm") != "00:00"
            ? $" at {deadlineDate:HH:mm} EAT" : string.Empty;

        var smsMessage =
            $"AyiyaCMS REMINDER: {deadlineType} {urgency} — {matterTitle} " +
            $"({clientName}) at {courtStation} on {dateStr}{timeStr}.";

        var emailSubject = $"[AyiyaCMS] {deadlineType} {urgency} — {matterTitle}";
        var emailHtml    = BuildEmailHtml(
            matterTitle, clientName, courtStation,
            deadlineType, dateStr, timeStr, daysUntil);

        // ── Notify assigned lawyer ────────────────────
        if (lawyer != null)
        {
            // Email
            try
            {
                await emailSvc.SendEmailAsync(lawyer.Email, emailSubject, emailHtml);
                await audit.WriteAsync("Matter", matterId, $"ReminderSent",
                    "System",
                    $"Email reminder sent to lawyer {lawyer.FullName} ({lawyer.Email}) — " +
                    $"{deadlineType} in {daysUntil} day(s): {matterTitle}");
                _logger.LogInformation("[ReminderJob] Email sent to lawyer {Name}", lawyer.FullName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ReminderJob] Failed to email lawyer {Name}", lawyer.FullName);
            }

            // SMS
            if (!string.IsNullOrWhiteSpace(lawyer.Phone))
            {
                var sent = await smsSvc.SendSmsAsync(lawyer.Phone, smsMessage);
                if (sent)
                {
                    await audit.WriteAsync("Matter", matterId, "ReminderSent",
                        "System",
                        $"SMS reminder sent to lawyer {lawyer.FullName} ({lawyer.Phone}) — " +
                        $"{deadlineType} in {daysUntil} day(s): {matterTitle}");
                }
            }
            else
            {
                _logger.LogWarning("[ReminderJob] Lawyer {Name} has no phone number — SMS skipped.",
                    lawyer.FullName);
            }
        }

        // ── Notify client ─────────────────────────────
        if (!string.IsNullOrWhiteSpace(clientEmail))
        {
            var clientSubject = $"[AyiyaCMS] Upcoming {deadlineType} — {matterTitle}";
            var clientHtml    = BuildClientEmailHtml(
                matterTitle, courtStation, deadlineType, dateStr, timeStr, daysUntil);
            try
            {
                await emailSvc.SendEmailAsync(clientEmail, clientSubject, clientHtml);
                await audit.WriteAsync("Matter", matterId, "ReminderSent",
                    "System",
                    $"Email reminder sent to client ({clientEmail}) — " +
                    $"{deadlineType} in {daysUntil} day(s): {matterTitle}");
                _logger.LogInformation("[ReminderJob] Email sent to client {Email}", clientEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ReminderJob] Failed to email client {Email}", clientEmail);
            }
        }
    }

    // ── Email templates ───────────────────────────────
    private static string BuildEmailHtml(
        string matterTitle, string clientName, string courtStation,
        string deadlineType, string dateStr, string timeStr, int daysUntil)
    {
        var urgencyColor = daysUntil == 1 ? "#B91C1C" : daysUntil == 3 ? "#92620A" : "#1A5C52";
        var urgencyText  = daysUntil == 1 ? "TOMORROW" : $"in {daysUntil} days";

        return $"""
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#1C1C1C;">
              <div style="background:#0B2B26;padding:24px 32px;border-radius:6px 6px 0 0;">
                <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#fff;">AyiyaCMS</span>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #E8E4DC;border-top:none;border-radius:0 0 6px 6px;">
                <div style="background:{urgencyColor}15;border-left:4px solid {urgencyColor};
                            padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:24px;">
                  <strong style="color:{urgencyColor};font-size:13px;text-transform:uppercase;
                                 letter-spacing:0.05em;">{deadlineType} {urgencyText}</strong>
                </div>
                <h2 style="font-family:Georgia,serif;color:#0B2B26;margin:0 0 20px;font-size:20px;">
                  {matterTitle}
                </h2>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;
                               color:#888;font-size:12px;width:140px;">Client</td>
                    <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;
                               font-weight:600;">{clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;
                               color:#888;font-size:12px;">Court Station</td>
                    <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;
                               font-weight:600;">{courtStation}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;
                               color:#888;font-size:12px;">{deadlineType} Date</td>
                    <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;
                               font-weight:600;color:{urgencyColor};">{dateStr}{timeStr}</td>
                  </tr>
                </table>
                <p style="color:#555;font-size:13px;line-height:1.7;margin:0 0 8px;">
                  This is an automated reminder from AyiyaCMS. Please ensure all
                  necessary preparations are completed before the {deadlineType.ToLower()}.
                </p>
                <hr style="border:none;border-top:1px solid #E8E4DC;margin:24px 0 16px;" />
                <p style="color:#bbb;font-size:11px;margin:0;">
                  AyiyaCMS · Automated Deadline Reminder · Do not reply to this email.
                </p>
              </div>
            </div>
            """;
    }

    private static string BuildClientEmailHtml(
        string matterTitle, string courtStation,
        string deadlineType, string dateStr, string timeStr, int daysUntil)
    {
        var urgencyColor = daysUntil == 1 ? "#B91C1C" : daysUntil == 3 ? "#92620A" : "#1A5C52";
        var urgencyText  = daysUntil == 1 ? "tomorrow" : $"in {daysUntil} days";

        return $"""
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#1C1C1C;">
              <div style="background:#0B2B26;padding:24px 32px;border-radius:6px 6px 0 0;">
                <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#fff;">AyiyaCMS</span>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #E8E4DC;border-top:none;border-radius:0 0 6px 6px;">
                <h2 style="font-family:Georgia,serif;color:#0B2B26;margin:0 0 12px;">
                  Upcoming {deadlineType} Reminder
                </h2>
                <p style="color:#555;line-height:1.7;margin:0 0 20px;">
                  This is a courtesy reminder that you have an upcoming {deadlineType.ToLower()}
                  <strong style="color:{urgencyColor};">{urgencyText}</strong>
                  in the matter: <strong>{matterTitle}</strong>.
                </p>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;
                               color:#888;font-size:12px;width:140px;">Court Station</td>
                    <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;
                               font-weight:600;">{courtStation}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;color:#888;font-size:12px;">Date</td>
                    <td style="padding:10px 0;font-weight:600;
                               color:{urgencyColor};">{dateStr}{timeStr}</td>
                  </tr>
                </table>
                <p style="color:#888;font-size:12px;line-height:1.7;margin:0;">
                  Please contact your assigned lawyer if you have any questions.
                </p>
                <hr style="border:none;border-top:1px solid #E8E4DC;margin:24px 0 16px;" />
                <p style="color:#bbb;font-size:11px;margin:0;">
                  AyiyaCMS · Automated Reminder · Do not reply to this email.
                </p>
              </div>
            </div>
            """;
    }
}