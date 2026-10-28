// AyiyaCMS.Infrastructure/Features/Calendar/ReminderDispatchJob.cs
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AyiyaCMS.Infrastructure.Features.Calendar;

public class ReminderDispatchJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ReminderDispatchJob> _logger;

    public ReminderDispatchJob(IServiceProvider services, ILogger<ReminderDispatchJob> logger)
    {
        _services = services;
        _logger   = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope  = _services.CreateScope();
                var db           = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

                var due = await db.Reminders
                    .Include(r => r.User)
                    .Include(r => r.Event)
                        .ThenInclude(e => e!.Matter)
                            .ThenInclude(m => m!.Client)
                    .Include(r => r.Task)
                        .ThenInclude(t => t!.Matter)
                            .ThenInclude(m => m!.Client)
                    .Where(r => r.RemindAt <= DateTime.UtcNow && !r.SentEmail)
                    .ToListAsync(stoppingToken);

                foreach (var reminder in due)
                {
                    try
                    {
                        // Skip (but still mark as sent) if the linked task was already
                        // completed before this reminder fired.
                        if (reminder.Task?.IsCompleted == true)
                        {
                            reminder.SentEmail = true;
                            _logger.LogInformation(
                                "Skipping reminder {Id}: task already completed", reminder.Id
                            );
                            continue;
                        }

                        if (reminder.User?.Email != null)
                        {
                            var html    = BuildReminderEmail(reminder);
                            var subject = reminder.Event?.Title
                                          ?? reminder.Task?.Title
                                          ?? reminder.Message;

                            await emailService.SendEmailAsync(
                                reminder.User.Email,
                                $"Reminder: {subject}",
                                html
                            );
                        }

                        reminder.SentEmail = true;

                        _logger.LogInformation(
                            "Reminder dispatched: {Message} → {User}",
                            reminder.Message, reminder.User?.Email
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send reminder {Id}", reminder.Id);
                    }
                }

                if (due.Any()) await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Reminder dispatch job failed.");
            }

            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }

    // ── HTML encode without System.Web ──────────────────────────────────────────
    private static string HtmlEncode(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        return value
            .Replace("&",  "&amp;")
            .Replace("<",  "&lt;")
            .Replace(">",  "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'",  "&#39;");
    }

    // ── Email Builder ───────────────────────────────────────────────────────────
    private static string BuildReminderEmail(Reminder reminder)
    {
        var evt    = reminder.Event;
        var task   = reminder.Task;

        // Matter/Client can come from either the linked event or the linked task.
        var matter = evt?.Matter ?? task?.Matter;
        var client = matter?.Client;

        // Fall back to RemindAt if neither Event.StartAt nor Task.DueDate is available.
        var hearingDate = evt?.StartAt ?? task?.DueDate ?? reminder.RemindAt;
        var daysUntil   = (int)Math.Ceiling((hearingDate - DateTime.UtcNow).TotalDays);
        var userName    = reminder.User?.FullName ?? reminder.User?.Email ?? "Team";

        // ── Banner label ──
        var bannerLabel = daysUntil switch
        {
            <= 0 => "TODAY",
            1    => "TOMORROW",
            _    => $"IN {daysUntil} DAYS"
        };

        // ── Banner color ──
        var bannerColor = daysUntil switch
        {
            <= 1 => "#dc2626",
            <= 3 => "#d97706",
            <= 7 => "#1e4d3b",
            _    => "#374151"
        };

        // ── Formatted date ──
        var hearingDisplay = hearingDate.ToString("dddd, dd MMMM yyyy");

        // ── Content ──
        var title        = HtmlEncode(evt?.Title ?? task?.Title ?? matter?.Title ?? reminder.Message);
        var clientName   = HtmlEncode(client?.Name ?? "—");
        var courtStation = HtmlEncode(evt?.Location ?? matter?.CourtStation ?? "—");
        var dateLabel    = evt is not null ? "Hearing Date" : task is not null ? "Due Date" : "Reminder Date";
        var noteRow      = string.IsNullOrWhiteSpace(reminder.Message)
                           ? string.Empty
                           : DetailRow("Note", HtmlEncode(reminder.Message));

        return $$"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Reminder</title>
              <style>
                @media only screen and (max-width:600px) {
                  .container { width:100% !important; border-radius:0 !important; }
                  .body-pad  { padding:24px 16px !important; }
                }
              </style>
            </head>
            <body style="margin:0;padding:0;background:#f3f4f6;
                         font-family:'Segoe UI',Arial,sans-serif;">

              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f3f4f6;padding:32px 0;">
                <tr><td align="center" style="padding:0 12px;">

                  <table class="container" width="600" cellpadding="0" cellspacing="0"
                         style="background:#ffffff;border-radius:12px;overflow:hidden;
                                max-width:600px;width:100%;
                                box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                      <td style="background:#1e4d3b;padding:20px 32px;">
                        <h1 style="margin:0;font-size:20px;font-weight:700;
                                   color:#ffffff;letter-spacing:-0.3px;">
                          AyiyaCMS
                        </h1>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td class="body-pad" style="padding:28px 32px 0;">

                        <!-- Banner -->
                        <div style="background:#f0f5f2;border-left:4px solid {{bannerColor}};
                                    border-radius:4px;padding:12px 16px;margin-bottom:24px;">
                          <span style="font-size:12px;font-weight:700;
                                       color:{{bannerColor}};letter-spacing:1.5px;
                                       text-transform:uppercase;">
                            {{bannerLabel}}
                          </span>
                        </div>

                        <!-- Matter Title -->
                        <h2 style="margin:0 0 28px;font-size:26px;font-weight:700;
                                   color:#111827;line-height:1.2;letter-spacing:-0.5px;">
                          {{title}}
                        </h2>

                        <!-- Detail Table -->
                        <table width="100%" cellpadding="0" cellspacing="0"
                               style="margin-bottom:28px;">
                          {{DetailRow("Client",        clientName)}}
                          {{DetailRow("Court Station", courtStation)}}
                          {{DetailRow(dateLabel,       hearingDisplay, bannerColor)}}
                          {{noteRow}}
                        </table>

                        <!-- Note -->
                        <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.7;">
                          This is an automated reminder from AyiyaCMS.
                          Please ensure all necessary preparations are completed
                          before the {{(daysUntil <= 1 ? "deadline" : "upcoming deadline")}}.
                        </p>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:0 32px 28px;">
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
                        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                          AyiyaCMS &bull; Automated Deadline Reminder &bull;
                          Do not reply to this email
                        </p>
                      </td>
                    </tr>

                  </table>
                </td></tr>
              </table>

            </body>
            </html>
            """;
    }

    // ── Detail row helper ───────────────────────────────────────────────────────
    private static string DetailRow(
        string label,
        string value,
        string? highlightColor = null)
    {
        var valueColor = highlightColor ?? "#111827";
        return $$"""
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;
                         width:160px;font-size:13px;color:#6b7280;vertical-align:top;">
                {{label}}
              </td>
              <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;
                         font-size:13px;font-weight:600;
                         color:{{valueColor}};vertical-align:top;">
                {{value}}
              </td>
            </tr>
            """;
    }
}