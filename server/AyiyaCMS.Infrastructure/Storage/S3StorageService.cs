// AyiyaCMS.Infrastructure/Storage/S3StorageService.cs
using Amazon.S3;
using Amazon.S3.Model;

namespace AyiyaCMS.Infrastructure.Storage;

public class S3StorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public S3StorageService(IAmazonS3 s3Client, string bucketName)
    {
        _s3Client = s3Client;
        _bucketName = bucketName;
    }

    // ── Upload a file to S3 ───────────────────────────
    public async Task<string> UploadAsync(string key, Stream fileStream, string contentType)
    {
        var request = new PutObjectRequest
        {
            BucketName  = _bucketName,
            Key         = key,
            InputStream = fileStream,
            ContentType = contentType,
            ServerSideEncryptionMethod = ServerSideEncryptionMethod.AES256
        };

        await _s3Client.PutObjectAsync(request);
        return key;
    }

    // ── Generate a presigned download URL ─────────────
    public Task<string> GetPresignedUrlAsync(string key, int expiryMinutes = 15)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key        = key,
            Expires    = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Verb       = HttpVerb.GET
        };

        var url = _s3Client.GetPreSignedURL(request);
        return Task.FromResult(url);
    }

    // ── Delete a file from S3 ─────────────────────────
    public async Task DeleteAsync(string key)
    {
        var request = new DeleteObjectRequest
        {
            BucketName = _bucketName,
            Key        = key
        };

        await _s3Client.DeleteObjectAsync(request);
    }

    // ── Check if a file exists ────────────────────────
    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            await _s3Client.GetObjectMetadataAsync(_bucketName, key);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    // ── Keep old method for backward compatibility ────
    public Task<string> UploadFileAsync(string key, Stream fileStream, string contentType)
        => UploadAsync(key, fileStream, contentType);
    
    public async Task<byte[]> DownloadAsync(string key)
    {
        var request = new GetObjectRequest { BucketName = _bucketName, Key = key };
        using var response = await _s3Client.GetObjectAsync(request);
        using var ms = new MemoryStream();
        await response.ResponseStream.CopyToAsync(ms);
        return ms.ToArray();
    }

    // ── Generate expiring share link (48 hours) ───────
    public Task<string> GenerateShareLinkAsync(string key)
        => GetPresignedUrlAsync(key, expiryMinutes: 48 * 60);
}