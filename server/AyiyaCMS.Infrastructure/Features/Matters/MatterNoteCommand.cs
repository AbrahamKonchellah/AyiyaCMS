using AyiyaCMS.Application.Features.Matters.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Matters;

public class MatterNoteCommand
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly AuditService _audit;

    public MatterNoteCommand(AppDbContext db, IEmailService email, AuditService audit)
    {
        _db    = db;
        _email = email;
        _audit = audit;
    }

    // ── Get notes for a matter ────────────────────────
    // staffView = true → return all notes
    // staffView = false → return only Client-visible notes
    public async Task<List<MatterNoteDto>> GetNotesAsync(Guid matterId, bool staffView)
    {
        var query = _db.MatterNotes
            .Include(n => n.Author)
            .Where(n => n.MatterId == matterId);

        if (!staffView)
            query = query.Where(n => n.Visibility == "Client");

        return await query
            .OrderBy(n => n.CreatedAt)
            .Select(n => ToDto(n))
            .ToListAsync();
    }

    // ── Create a note ─────────────────────────────────
    public async Task<MatterNoteDto> CreateNoteAsync(
        Guid matterId, Guid authorId, string authorRole,
        CreateMatterNoteRequest request)
    {
        var author = await _db.Users.FindAsync(authorId);
        if (author == null) throw new InvalidOperationException("Author not found.");

        // Clients can only create Client-visible notes
        var visibility = authorRole == "Client" ? "Client" : request.Visibility;

        var note = new MatterNote
        {
            Id           = Guid.NewGuid(),
            MatterId     = matterId,
            AuthorId     = authorId,
            AuthorName   = author.FullName,
            AuthorRole   = authorRole,
            Content      = request.Content.Trim(),
            Visibility   = visibility,
            ParentNoteId = request.ParentNoteId != null
                ? Guid.Parse(request.ParentNoteId) : null,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        _db.MatterNotes.Add(note);
        await _db.SaveChangesAsync();

        await _audit.WriteAsync("MatterNote", note.Id.ToString(), "Created",
            author.FullName,
            $"MatterId: {matterId}, Visibility: {visibility}");

        // ── Email assigned lawyer when client posts ───
        if (authorRole == "Client")
        {
            var matter = await _db.Matters
                .Include(m => m.AssignedLawyer)
                .FirstOrDefaultAsync(m => m.Id == matterId);

            if (matter?.AssignedLawyer != null)
            {
                try
                {
                    await _email.SendEmailAsync(
                        matter.AssignedLawyer.Email,
                        $"[AyiyaCMS] New client message — {matter.Title}",
                        BuildClientMessageEmailHtml(
                            matter.AssignedLawyer.FirstName,
                            author.FullName,
                            matter.Title,
                            note.Content));
                }
                catch
                {
                    // best-effort — don't fail the note creation
                }
            }
        }

        return ToDto(note);
    }

    // ── Delete a note ─────────────────────────────────
    public async Task<bool> DeleteNoteAsync(Guid noteId, Guid requesterId, string requesterRole)
    {
        var note = await _db.MatterNotes.FindAsync(noteId);
        if (note == null) return false;

        // Only author or Admin/Partner can delete
        if (note.AuthorId != requesterId &&
            requesterRole != "Admin" &&
            requesterRole != "Partner")
            return false;

        _db.MatterNotes.Remove(note);
        await _db.SaveChangesAsync();
        return true;
    }

    private static MatterNoteDto ToDto(MatterNote n) => new(
        n.Id.ToString(),
        n.MatterId.ToString(),
        n.AuthorId.ToString(),
        n.AuthorName,
        n.AuthorRole,
        n.Content,
        n.Visibility,
        n.ParentNoteId?.ToString(),
        n.CreatedAt
    );

    private static string BuildClientMessageEmailHtml(
        string lawyerFirstName, string clientName,
        string matterTitle, string messageContent)
    {
        return $"""
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;color:#1C1C1C;">
              <div style="background:#0B2B26;padding:24px 32px;border-radius:6px 6px 0 0;">
                <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#fff;">AyiyaCMS</span>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #E8E4DC;border-top:none;border-radius:0 0 6px 6px;">
                <h2 style="font-family:Georgia,serif;color:#0B2B26;margin:0 0 12px;">New Client Message</h2>
                <p style="color:#555;line-height:1.7;margin:0 0 8px;">Dear {lawyerFirstName},</p>
                <p style="color:#555;line-height:1.7;margin:0 0 20px;">
                  <strong>{clientName}</strong> has sent a message regarding
                  the matter: <strong>{matterTitle}</strong>.
                </p>
                <div style="background:#F7F4EE;border-left:4px solid #D4A853;
                            padding:16px 20px;border-radius:0 4px 4px 0;margin-bottom:24px;">
                  <p style="margin:0;font-size:14px;color:#1C1C1C;line-height:1.7;">
                    {System.Net.WebUtility.HtmlEncode(messageContent)}
                  </p>
                </div>
                <p style="color:#888;font-size:12px;line-height:1.7;margin:0;">
                  Log in to AyiyaCMS to view and reply to this message.
                </p>
                <hr style="border:none;border-top:1px solid #E8E4DC;margin:24px 0 16px;" />
                <p style="color:#bbb;font-size:11px;margin:0;">
                  AyiyaCMS · Automated Notification · Do not reply to this email.
                </p>
              </div>
            </div>
            """;
    }
}