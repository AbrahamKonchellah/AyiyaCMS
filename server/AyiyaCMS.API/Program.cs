using AyiyaCMS.Infrastructure.Data;
using AyiyaCMS.Infrastructure.Services;
using AyiyaCMS.Infrastructure.Storage;
using AyiyaCMS.Infrastructure.Features.Auth;
using AyiyaCMS.Infrastructure.Features.Admin;
using AyiyaCMS.Infrastructure.Features.Matters;
using AyiyaCMS.Infrastructure.Features.Clients; 
using AyiyaCMS.Infrastructure.Features.Documents; 
using AyiyaCMS.Infrastructure.Features.TimeEntries;
using AyiyaCMS.Infrastructure.Configuration;
using AyiyaCMS.Infrastructure.Features.Billing;
using QuestPDF.Infrastructure;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using AyiyaCMS.Infrastructure.Features.Dashboard;
using AyiyaCMS.Infrastructure.Features.Calendar;
using Npgsql;
using AyiyaCMS.Infrastructure.Features.Payments;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<DashboardCommand>();
builder.Services.AddScoped<AdminDashboardCommand>();
builder.Services.AddScoped<ClientDashboardCommand>();
builder.Services.AddScoped<ResetPasswordCommand>();
builder.Services.AddScoped<IEmailService, GmailSmtpEmailService>();
builder.Services.AddSingleton<SystemHealthCommand>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddHostedService<DeadlineReminderJob>();
builder.Services.AddHttpClient<ISmsService, AfricasTalkingSmsService>();
builder.Services.Configure<AfricasTalkingSettings>(
builder.Configuration.GetSection(AfricasTalkingSettings.SectionName));
builder.Services.AddScoped<MatterNoteCommand>();

// ── M-Pesa (Daraja) ────────────────────────────────────
// Bind Mpesa:* user secrets (ConsumerKey, ConsumerSecret, Shortcode, Passkey, CallbackUrl) to MpesaSettings
builder.Services.Configure<MpesaSettings>(builder.Configuration.GetSection(MpesaSettings.SectionName));

// AddHttpClient registers MpesaService for DI AND gives it a pooled HttpClient — AddScoped alone
// cannot inject HttpClient or apply the timeout, which is why the previous version didn't compile.
builder.Services.AddHttpClient<IMpesaService, MpesaService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddScoped<InvoiceCommand>();

// ── CORS ──────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ── Database ──────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                           ?? "Host=localhost;Database=ayiyacms;Username=postgres;Password=password";

    var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
    dataSourceBuilder.ConnectionStringBuilder.KeepAlive = 30;
    dataSourceBuilder.ConnectionStringBuilder.ConnectionIdleLifetime = 60;
    dataSourceBuilder.ConnectionStringBuilder.ConnectionPruningInterval = 10;
    dataSourceBuilder.ConnectionStringBuilder.NoResetOnClose = true; // skip reset ping on return
    var dataSource = dataSourceBuilder.Build();

    options.UseNpgsql(dataSource, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
        npgsqlOptions.CommandTimeout(30);
    });
});
// ── Authentication ────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],

            

            IssuerSigningKey = new SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(
                    builder.Configuration["Jwt:Secret"] ?? "ReplaceThisWithMin32CharSecret!"))
        };
    });

// ── Authorization + Role Policies ─────────────────────
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly",      policy => policy.RequireRole("Admin"));
    options.AddPolicy("PartnerOnly",    policy => policy.RequireRole("Partner"));
    options.AddPolicy("StaffOnly",      policy => policy.RequireRole("Admin", "Partner", "Associate", "Paralegal"));
    options.AddPolicy("LawyersOnly",    policy => policy.RequireRole("Partner", "Associate","Paralegal"));
    options.AddPolicy("PartnerOrAdmin", policy => policy.RequireRole("Admin", "Partner"));
    options.AddPolicy("ClientOnly",     policy => policy.RequireRole("Client"));
    options.AddPolicy("AuditorOrAdmin", policy => policy.RequireRole("Admin", "Auditor"));
});

// ── App Services ──────────────────────────────────────
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<MfaService>();
builder.Services.AddScoped<MfaCommand>();
builder.Services.AddScoped<LoginCommand>();
builder.Services.AddScoped<RegisterCommand>();
builder.Services.AddScoped<MatterAccessService>();
builder.Services.AddScoped<UserManagementCommand>();
builder.Services.AddScoped<MatterCommand>();
builder.Services.AddScoped<ClientCommand>();
builder.Services.AddScoped<DocumentCommand>();
builder.Services.AddSingleton<SystemHealthCommand>(); 
builder.Services.AddSingleton<MeilisearchService>();
builder.Services.AddScoped<TimeEntryCommand>();
builder.Services.Configure<FirmSettings>(builder.Configuration.GetSection("Firm"));
builder.Services.AddScoped<FeeNoteCommand>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<InvoiceCommand>();
builder.Services.AddScoped<CalendarCommand>();
builder.Services.AddHostedService<ReminderDispatchJob>();
builder.Services.AddHostedService<DeadlineReminderJob>();

// ── S3-Compatible Storage ──────────
builder.Services.AddSingleton<IAmazonS3>(sp =>
{
    var accessKey  = builder.Configuration["AWS:AccessKeyId"];
    var secretKey  = builder.Configuration["AWS:SecretAccessKey"];
    var serviceUrl = builder.Configuration["AWS:ServiceURL"];   
    var region     = builder.Configuration["AWS:Region"] ?? "eu-west-1";

    var config = new AmazonS3Config
    {
        ServiceURL           = serviceUrl,
        ForcePathStyle       = true,   
        AuthenticationRegion = region  
    };

    return new AmazonS3Client(accessKey, secretKey, config);
});

builder.Services.AddSingleton(sp =>
{
    var bucketName = builder.Configuration["AWS:BucketName"] ?? string.Empty;
    return new S3StorageService(sp.GetRequiredService<IAmazonS3>(), bucketName);
});

// ── Pipeline ──────────────────────────────────────────
var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowReact");
//app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Ok("AyiyaCMS API is running"));

try
{
    using var scope = app.Services.CreateScope();
    var meili = scope.ServiceProvider.GetRequiredService<MeilisearchService>();
    await meili.EnsureIndexConfiguredAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(
        "Could not configure Meilisearch index at startup: {Message}", ex.Message);
}

app.Run();