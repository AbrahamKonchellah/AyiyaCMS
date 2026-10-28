// AyiyaCMS.Infrastructure/Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;
using AyiyaCMS.Domain.Entities;

namespace AyiyaCMS.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Matter> Matters => Set<Matter>();
    public DbSet<MatterStaff> MatterStaff => Set<MatterStaff>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<FeeNote> FeeNotes { get; set; } = null!;
    public DbSet<CalendarEvent> CalendarEvents { get; set; } = null!;
    public DbSet<UserTask> UserTasks { get; set; } = null!;
    public DbSet<Reminder> Reminders { get; set; } = null!;
    public DbSet<MatterNote> MatterNotes => Set<MatterNote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
            entity.Property(u => u.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(u => u.LastName).IsRequired().HasMaxLength(100);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Role).HasMaxLength(50);
            entity.Ignore(u => u.FullName);
        });

        // ── Client ────────────────────────────────────────────
        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(255);
            entity.Property(c => c.Email).HasMaxLength(255);
        });

        // ── Matter ────────────────────────────────────────────
        modelBuilder.Entity<Matter>(entity =>
        {
            entity.HasKey(m => m.Id);

            entity.HasOne(m => m.Client)
                  .WithMany(c => c.Matters)
                  .HasForeignKey(m => m.ClientId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.AssignedLawyer)
                  .WithMany()
                  .HasForeignKey(m => m.AssignedLawyerId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ── MatterStaff ───────────────────────────────────────
        modelBuilder.Entity<MatterStaff>(entity =>
        {
            // Composite PK — one row per user per matter
            entity.HasKey(ms => new { ms.MatterId, ms.UserId });

            entity.HasOne(ms => ms.Matter)
                  .WithMany(m => m.Staff)
                  .HasForeignKey(ms => ms.MatterId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ms => ms.User)
                  .WithMany()
                  .HasForeignKey(ms => ms.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(ms => ms.Role).IsRequired().HasMaxLength(50);
        });

        // ── TimeEntry ─────────────────────────────────────────
        modelBuilder.Entity<TimeEntry>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.HasOne(t => t.Matter)
                  .WithMany(m => m.TimeEntries)
                  .HasForeignKey(t => t.MatterId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(t => t.User)
                  .WithMany()
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.FeeNote)
                  .WithMany()
                  .HasForeignKey(t => t.FeeNoteId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Document ──────────────────────────────────────────
        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(d => d.Id);

            entity.HasOne(d => d.Matter)
                  .WithMany(m => m.Documents)
                  .HasForeignKey(d => d.MatterId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.UploadedBy)
                  .WithMany()
                  .HasForeignKey(d => d.UploadedById)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.Property(d => d.FileName).IsRequired().HasMaxLength(500);
            entity.Property(d => d.OriginalFileName).HasMaxLength(500);
            entity.Property(d => d.Checksum).HasMaxLength(64);
            entity.Property(d => d.ContentType).HasMaxLength(100);
        });

        // ── FeeNote ───────────────────────────────────────────
        modelBuilder.Entity<FeeNote>(entity =>
        {
            entity.HasKey(f => f.Id);

            entity.HasOne(f => f.Matter)
                  .WithMany(m => m.FeeNotes)
                  .HasForeignKey(f => f.MatterId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(f => f.GeneratedBy)
                  .WithMany()
                  .HasForeignKey(f => f.GeneratedById)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(f => f.ApprovedBy)
                  .WithMany()
                  .HasForeignKey(f => f.ApprovedById)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.Property(f => f.FeeNoteNumber).IsRequired().HasMaxLength(50);
            entity.Property(f => f.Status).IsRequired().HasMaxLength(30);
        });

        // ── Invoice ───────────────────────────────────────────
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasOne(i => i.FeeNote)
                  .WithMany()
                  .HasForeignKey(i => i.FeeNoteId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(i => i.CreatedBy)
                  .WithMany()
                  .HasForeignKey(i => i.CreatedById)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(i => i.SentBy)
                  .WithMany()
                  .HasForeignKey(i => i.SentById)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ── AuditLog ──────────────────────────────────────────
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(a => a.Id);
        });

        // ── CalendarEvent ─────────────────────────────────────
        modelBuilder.Entity<CalendarEvent>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.CreatedBy)
                  .WithMany()
                  .HasForeignKey(e => e.CreatedById)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Matter)
                  .WithMany(m => m.CalendarEvents)
                  .HasForeignKey(e => e.MatterId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Location).HasMaxLength(300);
            entity.Property(e => e.Color).HasMaxLength(20);
            entity.Property(e => e.RecurrenceRule).HasMaxLength(500);
        });

        // ── UserTask ──────────────────────────────────────────
        modelBuilder.Entity<UserTask>(entity =>
        {
            entity.HasKey(t => t.Id);

            entity.HasOne(t => t.AssignedTo)
                  .WithMany()
                  .HasForeignKey(t => t.AssignedToId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.AssignedBy)
                  .WithMany()
                  .HasForeignKey(t => t.AssignedById)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.Matter)
                  .WithMany(m => m.Tasks)
                  .HasForeignKey(t => t.MatterId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.Property(t => t.Title).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Priority).HasMaxLength(20);
        });

        // ── Reminder ──────────────────────────────────────────
        modelBuilder.Entity<Reminder>(entity =>
        {
            entity.HasKey(r => r.Id);

            entity.HasOne(r => r.Event)
                  .WithMany(e => e.Reminders)
                  .HasForeignKey(r => r.EventId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.Task)
                  .WithMany(t => t.Reminders)
                  .HasForeignKey(r => r.TaskId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                  .WithMany()
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(r => r.Message).IsRequired().HasMaxLength(500);
        });
    }
}