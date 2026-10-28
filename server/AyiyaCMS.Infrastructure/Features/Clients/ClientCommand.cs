// AyiyaCMS.Infrastructure/Features/Clients/ClientCommand.cs
using AyiyaCMS.Application.Features.Clients.DTOs;
using AyiyaCMS.Application.Features.Matters.DTOs;
using AyiyaCMS.Domain.Entities;
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Features.Clients;

public class ClientCommand
{
    private readonly AppDbContext _db;

    public ClientCommand(AppDbContext db) => _db = db;

    // ── Get all clients ───────────────────────────────
    public async Task<List<ClientDto>> GetAllAsync(string? search = null)
    {
        var query = _db.Clients
            .Include(c => c.Matters)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.ToLower();
            query  = query.Where(c =>
                c.Name.ToLower().Contains(search) ||
                c.Email.ToLower().Contains(search) ||
                c.Phone.Contains(search));
        }

        return await query
            .OrderBy(c => c.Name)
            .Select(c => new ClientDto(
                c.Id,
                c.Name,
                c.Email,
                c.Phone,
                c.Address,
                c.Matters != null ? c.Matters.Count : 0,
                c.CreatedAt))
            .ToListAsync();
    }

    // ── Get single client with matters ────────────────
    public async Task<(ClientDto? client, List<MatterDto> matters)> GetByIdAsync(Guid id)
    {
        var client = await _db.Clients
            .Include(c => c.Matters)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null) return (null, []);

        var clientDto = new ClientDto(
            client.Id, client.Name, client.Email,
            client.Phone, client.Address,
            client.Matters?.Count ?? 0,
            client.CreatedAt);

        var matters = await _db.Matters
            .Include(m => m.AssignedLawyer)
            .Where(m => m.ClientId == id)
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new MatterDto(
                m.Id, m.Title, m.JICMSCaseNumber, m.CourtStation,
                m.Status, m.HearingDate, m.FilingDeadline,
                m.ClientId,
                client.Name,
                m.AssignedLawyerId,
                m.AssignedLawyer != null ? m.AssignedLawyer.FullName : null,
                new(),
                m.CreatedAt, m.UpdatedAt))
            .ToListAsync();

        return (clientDto, matters);
    }

    // ── Create client ─────────────────────────────────
    public async Task<(bool success, string message, ClientDto? client)> CreateAsync(
        CreateClientRequest request)
    {
        bool exists = await _db.Clients
            .AnyAsync(c => c.Email.ToLower() == request.Email.ToLower());
        if (exists)
            return (false, "A client with this email already exists.", null);

        var client = new Client
        {
            Id        = Guid.NewGuid(),
            Name      = request.Name.Trim(),
            Email     = request.Email.ToLower().Trim(),
            Phone     = request.Phone.Trim(),
            Address   = request.Address.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Clients.Add(client);
        await _db.SaveChangesAsync();

        return (true, "Client created successfully.", new ClientDto(
            client.Id, client.Name, client.Email,
            client.Phone, client.Address, 0, client.CreatedAt));
    }

    // ── Update client ─────────────────────────────────
    public async Task<(bool success, string message, ClientDto? client)> UpdateAsync(
        Guid id, UpdateClientRequest request)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client == null) return (false, "Client not found.", null);

        // Check email uniqueness if changed
        if (!string.Equals(client.Email, request.Email, StringComparison.OrdinalIgnoreCase))
        {
            bool emailTaken = await _db.Clients
                .AnyAsync(c => c.Email.ToLower() == request.Email.ToLower() && c.Id != id);
            if (emailTaken)
                return (false, "Another client with this email already exists.", null);
        }

        client.Name      = request.Name.Trim();
        client.Email     = request.Email.ToLower().Trim();
        client.Phone     = request.Phone.Trim();
        client.Address   = request.Address.Trim();
        client.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var matterCount = await _db.Matters.CountAsync(m => m.ClientId == id);

        return (true, "Client updated.", new ClientDto(
            client.Id, client.Name, client.Email,
            client.Phone, client.Address, matterCount, client.CreatedAt));
    }

    // ── Delete client ─────────────────────────────────
    public async Task<(bool success, string message)> DeleteAsync(Guid id)
    {
        var client = await _db.Clients
            .Include(c => c.Matters)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null) return (false, "Client not found.");

        if (client.Matters != null && client.Matters.Any())
            return (false, "Cannot delete a client with active matters. Close all matters first.");

        _db.Clients.Remove(client);
        await _db.SaveChangesAsync();
        return (true, "Client deleted.");
    }

    // ── Get lawyers for assignment dropdown ───────────
    public async Task<List<(Guid Id, string Name)>> GetLawyersAsync()
    {
        return await _db.Users
            .Where(u => u.IsActive &&
                (u.Role == "Partner" || u.Role == "Associate"|| u.Role == "Paralegal"))
            .OrderBy(u => u.LastName)
            .Select(u => new ValueTuple<Guid, string>(u.Id, u.FullName))
            .ToListAsync();
    }
}