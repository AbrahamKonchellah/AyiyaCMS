// AyiyaCMS.Infrastructure/Features/Dashboard/ClientDashboardCommand.cs
using AyiyaCMS.Application.Features.Dashboard.DTOs;
using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Dashboard;

public class ClientDashboardCommand
{
    private readonly AppDbContext _db;
    private readonly S3StorageService _storage;

    public ClientDashboardCommand(AppDbContext db, S3StorageService storage)
    {
        _db = db;
        _storage = storage;
    }

    // ── Resolve ClientId from UserId ──────────────────
    private async Task<Guid?> ResolveClientIdAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return null;

        var client = await _db.Clients
            .FirstOrDefaultAsync(c => c.Email == user.Email);

        return client?.Id;
    }

    // ── Stats ─────────────────────────────────────────
    public async Task<ClientDashboardStatsDto?> GetStatsAsync(Guid userId)
    {
        var clientId = await ResolveClientIdAsync(userId);
        if (clientId == null) return null;

        var now            = DateTime.UtcNow;
        var sevenDaysAhead = now.AddDays(7);

        var matters = await _db.Matters
            .Where(m => m.ClientId == clientId)
            .ToListAsync();

        var activeCount   = matters.Count(m => m.Status == "Active");
        var hearingsCount = matters.Count(m =>
            m.HearingDate.HasValue &&
            m.HearingDate.Value >= now &&
            m.HearingDate.Value <= sevenDaysAhead);

        var sharedDocs = await _db.Documents
            .Where(d => d.MatterId != null &&
                        matters.Select(m => m.Id).Contains(d.MatterId!.Value))
            .CountAsync();

        // Fixed: was filtering on "Pending" which never matched
        var outstanding = await _db.Invoices
            .Where(i => i.ClientId == clientId &&
                        (i.Status == "Sent" || i.Status == "Overdue"))
            .SumAsync(i => (decimal?)i.Amount) ?? 0m;

        return new ClientDashboardStatsDto
        {
            ActiveCases           = activeCount,
            UpcomingHearings      = hearingsCount,
            SharedDocuments       = sharedDocs,
            OutstandingBalanceKes = outstanding,
        };
    }

    // ── Active matters (dashboard summary) ───────────
    public async Task<List<ClientMatterDto>> GetMattersAsync(Guid userId)
    {
        var clientId = await ResolveClientIdAsync(userId);
        if (clientId == null) return [];

        return await _db.Matters
            .Include(m => m.AssignedLawyer)
            .Where(m => m.ClientId == clientId && m.Status == "Active")
            .OrderByDescending(m => m.UpdatedAt)
            .Select(m => new ClientMatterDto
            {
                Id                 = m.Id.ToString(),
                Title              = m.Title,
                JICMSCaseNumber    = m.JICMSCaseNumber,
                CourtStation       = m.CourtStation,
                Status             = m.Status,
                HearingDate        = m.HearingDate,
                FilingDeadline     = m.FilingDeadline,
                AssignedLawyerName = m.AssignedLawyer != null
                    ? $"{m.AssignedLawyer.FirstName} {m.AssignedLawyer.LastName}".Trim()
                    : null,
            })
            .ToListAsync();
    }

    // ── Recent invoices (dashboard summary) ──────────
    public async Task<List<ClientInvoiceDto>> GetInvoicesAsync(Guid userId)
    {
        var clientId = await ResolveClientIdAsync(userId);
        if (clientId == null) return [];

        return await _db.Invoices
            .Include(i => i.Matter)
            .Where(i => i.ClientId == clientId)
            .OrderByDescending(i => i.IssuedAt)
            .Take(10)
            .Select(i => new ClientInvoiceDto
            {
                Id          = i.Id.ToString(),
                MatterTitle = i.Matter != null ? i.Matter.Title : "General",
                Amount      = i.Amount,
                IssuedAt    = i.IssuedAt,
                DueDate     = i.DueDate,
                Status      = i.Status,
            })
            .ToListAsync();
    }

    // ── All matters (My Cases page) ───────────────────
    public async Task<List<ClientMatterDto>> GetAllMattersAsync(Guid userId)
    {
        var clientId = await ResolveClientIdAsync(userId);
        if (clientId == null) return [];

        return await _db.Matters
            .Include(m => m.AssignedLawyer)
            .Where(m => m.ClientId == clientId)
            .OrderByDescending(m => m.UpdatedAt)
            .Select(m => new ClientMatterDto
            {
                Id                 = m.Id.ToString(),
                Title              = m.Title,
                JICMSCaseNumber    = m.JICMSCaseNumber,
                CourtStation       = m.CourtStation,
                Status             = m.Status,
                HearingDate        = m.HearingDate,
                FilingDeadline     = m.FilingDeadline,
                AssignedLawyerName = m.AssignedLawyer != null
                    ? $"{m.AssignedLawyer.FirstName} {m.AssignedLawyer.LastName}".Trim()
                    : null,
            })
            .ToListAsync();
    }

    // ── All invoices (My Invoices page) ───────────────
    public async Task<List<ClientInvoiceDto>> GetAllInvoicesAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        var clientId = await ResolveClientIdAsync(userId);
        if (clientId == null) return [];

        return await _db.Invoices
            .Include(i => i.Matter)
            .Where(i => i.ClientId == clientId)
            .OrderByDescending(i => i.IssuedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new ClientInvoiceDto
            {
                Id          = i.Id.ToString(),
                MatterTitle = i.Matter != null ? i.Matter.Title : "General",
                Amount      = i.Amount,
                IssuedAt    = i.IssuedAt,
                DueDate     = i.DueDate,
                Status      = i.Status,
            })
            .ToListAsync();
    }

    // ── Single invoice status (for polling) ──────────
    public async Task<ClientInvoiceDto?> GetInvoiceAsync(Guid userId, Guid invoiceId)
    {
        var clientId = await ResolveClientIdAsync(userId);
        if (clientId == null) return null;

        return await _db.Invoices
            .Include(i => i.Matter)
            .Where(i => i.Id == invoiceId && i.ClientId == clientId)
            .Select(i => new ClientInvoiceDto
            {
                Id          = i.Id.ToString(),
                MatterTitle = i.Matter != null ? i.Matter.Title : "General",
                Amount      = i.Amount,
                IssuedAt    = i.IssuedAt,
                DueDate     = i.DueDate,
                Status      = i.Status,
            })
            .FirstOrDefaultAsync();
    }

    // ── Documents for a client matter ─────────────────
    public async Task<List<ClientDocumentDto>?> GetMatterDocumentsAsync(Guid userId, Guid matterId)
    {
        var clientId = await ResolveClientIdAsync(userId);
        if (clientId == null) return null;

        // Verify this matter belongs to this client
        var matter = await _db.Matters
            .FirstOrDefaultAsync(m => m.Id == matterId && m.ClientId == clientId);
        if (matter == null) return null;

        var docs = await _db.Documents
            .Include(d => d.UploadedBy)
            .Where(d => d.MatterId == matterId)
            .OrderByDescending(d => d.UploadedAt)
            .ToListAsync();

        // Latest version only per filename
        return docs
            .GroupBy(d => d.OriginalFileName)
            .Select(g => g.OrderByDescending(d => d.Version).First())
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new ClientDocumentDto
            {
                Id               = d.Id.ToString(),
                OriginalFileName = d.OriginalFileName,
                ContentType      = d.ContentType,
                FileSizeBytes    = d.FileSizeBytes,
                Version          = d.Version,
                UploadedAt       = d.UploadedAt,
            })
            .ToList();
    }

    // ── Presigned download URL for a client document ──
    public async Task<string?> GetDocumentDownloadUrlAsync(Guid userId, Guid documentId)
    {
        var clientId = await ResolveClientIdAsync(userId);
        if (clientId == null) return null;

        var doc = await _db.Documents
            .Include(d => d.Matter)
            .FirstOrDefaultAsync(d => d.Id == documentId);

        if (doc == null) return null;

        // Verify the document's matter belongs to this client
        if (doc.Matter?.ClientId != clientId) return null;

        return await _storage.GetPresignedUrlAsync(doc.FileKey, 15);
    }
}