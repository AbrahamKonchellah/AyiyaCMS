// AyiyaCMS.Infrastructure/Services/MatterAccessService.cs
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Services;

public class MatterAccessService
{
    private readonly AppDbContext _db;

    public MatterAccessService(AppDbContext db) => _db = db;

    public async Task<bool> CanAccessMatterAsync(Guid userId, string userRole, Guid matterId)
    {
        // Admins and Partners can access all matters
        if (userRole == "Admin" || userRole == "Partner")
            return true;

        // Associates and Paralegals can only access assigned matters
        if (userRole == "Associate" || userRole == "Paralegal")
        {
            var matter = await _db.Matters
                .FirstOrDefaultAsync(m => m.Id == matterId && m.AssignedLawyerId == userId);
            return matter != null;
        }

        // Clients can only access their own matters
        if (userRole == "Client")
        {
            var matter = await _db.Matters
                .Include(m => m.Client)
                .FirstOrDefaultAsync(m => m.Id == matterId && m.Client!.Email == _db.Users
                    .Where(u => u.Id == userId)
                    .Select(u => u.Email)
                    .FirstOrDefault());
            return matter != null;
        }

        // Auditors get read-only — handled at controller level
        return userRole == "Auditor";
    }

    public async Task<List<Guid>> GetAccessibleMatterIdsAsync(Guid userId, string userRole)
    {
        var query = _db.Matters.AsQueryable();
        
        if (userRole == "Associate" || userRole == "Paralegal")
        query = query.Where(m => m.AssignedLawyerId == userId);
        
        if (userRole == "Client")
        {
            var clientEmail = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Email)
            .FirstOrDefaultAsync();
            query = query.Where(m => m.Client!.Email == clientEmail);
    }
    
    // Admin, Partner, Auditor: no filter — full access (matches GetMattersAsync today)
    return await query.Select(m => m.Id).ToListAsync();
    }
}