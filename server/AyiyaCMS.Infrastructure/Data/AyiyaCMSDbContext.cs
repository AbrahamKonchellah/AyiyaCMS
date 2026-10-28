using AyiyaCMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AyiyaCMS.Infrastructure.Data
{
    public class AyiyaCMSDbContext : DbContext
    {
        public AyiyaCMSDbContext(DbContextOptions<AyiyaCMSDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Client> Clients => Set<Client>();
        public DbSet<Matter> Matters => Set<Matter>();
        public DbSet<Document> Documents => Set<Document>();
        public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
        public DbSet<Invoice> Invoices => Set<Invoice>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>().HasKey(x => x.Id);
            modelBuilder.Entity<Client>().HasKey(x => x.Id);
            modelBuilder.Entity<Matter>().HasKey(x => x.Id);
            modelBuilder.Entity<Document>().HasKey(x => x.Id);
            modelBuilder.Entity<TimeEntry>().HasKey(x => x.Id);
            modelBuilder.Entity<Invoice>().HasKey(x => x.Id);
            modelBuilder.Entity<AuditLog>().HasKey(x => x.Id);

            modelBuilder.Entity<Client>()
                .HasMany(x => x.Matters)
                .WithOne(x => x.Client)
                .HasForeignKey(x => x.ClientId);

            modelBuilder.Entity<Matter>()
                .HasMany(x => x.Documents)
                .WithOne(x => x.Matter)
                .HasForeignKey(x => x.MatterId);

            base.OnModelCreating(modelBuilder);
        }
    }
}
