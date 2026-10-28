// AyiyaCMS.Infrastructure/Features/Dashboard/SystemHealthCommand.cs
using Amazon.S3;
using Amazon.S3.Model;
using AyiyaCMS.Application.Features.Dashboard.DTOs;
using AyiyaCMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Diagnostics;

namespace AyiyaCMS.Infrastructure.Features.Dashboard;

public class SystemHealthCommand
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAmazonS3            _s3;
    private readonly string               _bucketName;

    private long     _cachedStorageBytes = 0;
    private DateTime _storageCacheTime   = DateTime.MinValue;

    public SystemHealthCommand(IServiceScopeFactory scopeFactory, IAmazonS3 s3, IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _s3           = s3;
        _bucketName   = config["AWS:BucketName"] ?? string.Empty;
    }

    public async Task<SystemHealthDto> GetHealthAsync()
    {
        var sw = Stopwatch.StartNew();

        // ── Database ping ─────────────────────────────
        bool dbOnline;
        int  activeSessions = 0;
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            await db.Database.CanConnectAsync();
            dbOnline = true;

            var now = DateTime.UtcNow;
            activeSessions = await db.Users
                .CountAsync(u => u.RefreshToken != null &&
                                 u.RefreshTokenExpiry > now &&
                                 u.IsActive);
        }
        catch
        {
            dbOnline = false;
        }

        sw.Stop();
        var apiResponseMs = sw.ElapsedMilliseconds;

        // ── S3 availability ping (fast) ───────────────
        bool storageOnline = false;
        long storageUsed   = _cachedStorageBytes;

        try
        {
            await _s3.GetBucketLocationAsync(_bucketName);
            storageOnline = true;

            // Only recalculate storage used every 5 minutes
            if ((DateTime.UtcNow - _storageCacheTime).TotalMinutes >= 5)
            {
                long total   = 0;
                var request  = new ListObjectsV2Request { BucketName = _bucketName };
                ListObjectsV2Response response;
                do
                {
                    response  = await _s3.ListObjectsV2Async(request);
                    total    += response.S3Objects?.Sum(o => o.Size ?? 0L) ?? 0L;
                    request.ContinuationToken = response.NextContinuationToken;
                }
                while (response.IsTruncated == true);

                _cachedStorageBytes = total;
                _storageCacheTime   = DateTime.UtcNow;
                storageUsed         = total;
            }
        }
        catch
        {
            storageOnline = false;
        }

        return new SystemHealthDto
        {
            DatabaseOnline   = dbOnline,
            StorageOnline    = storageOnline,
            ApiResponseMs    = apiResponseMs,
            StorageUsedBytes = storageUsed,
            ActiveSessions   = activeSessions,
        };
    }
}