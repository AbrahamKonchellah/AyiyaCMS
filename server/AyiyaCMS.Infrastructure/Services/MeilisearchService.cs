using Meilisearch;
using AyiyaCMS.Infrastructure.Features.Documents;
using Microsoft.Extensions.Configuration;

namespace AyiyaCMS.Infrastructure.Services;

public class MeilisearchService
{
    private const string IndexName = "documents";
    private readonly MeilisearchClient _client;

    public MeilisearchService(IConfiguration config)
    {
        var url = config["Meilisearch:Url"] ?? "http://localhost:7700";
        var masterKey = config["Meilisearch:MasterKey"];
        _client = new MeilisearchClient(url, masterKey);
    }

    public async Task EnsureIndexConfiguredAsync()
    {
        var index = _client.Index(IndexName);

        // matterId must be filterable so search can be scoped per user's accessible matters
        var filterTask = await index.UpdateFilterableAttributesAsync(new[] { "matterId" });
        await index.WaitForTaskAsync(filterTask.TaskUid);

        var searchTask = await index.UpdateSearchableAttributesAsync(
            new[] { "originalFileName", "content", "matterTitle", "clientName" });
        await index.WaitForTaskAsync(searchTask.TaskUid);
    }

    public async Task IndexDocumentAsync(DocumentSearchEntry entry)
    {
        var index = _client.Index(IndexName);
        Console.WriteLine($"[Meilisearch] Sending document to index: {entry.Id}");
        var task = await index.AddDocumentsAsync(new[] { entry }, primaryKey: "id");
        Console.WriteLine($"[Meilisearch] Task queued: {task.TaskUid}, waiting...");
        await index.WaitForTaskAsync(task.TaskUid);
        Console.WriteLine($"[Meilisearch] Document indexed successfully: {entry.Id}");
    }

    public async Task DeleteDocumentAsync(Guid documentId)
    {
        var index = _client.Index(IndexName);
        await index.DeleteOneDocumentAsync(documentId.ToString());
    }

    public async Task<List<DocumentSearchEntry>> SearchAsync(
        string query, List<Guid> accessibleMatterIds, int limit = 20)
    {
        if (accessibleMatterIds.Count == 0)
            return new List<DocumentSearchEntry>();

        var index = _client.Index(IndexName);

        // Filter is built from server-side GUIDs only — never from raw user input
        var idList = string.Join(", ", accessibleMatterIds.Select(id => $"\"{id}\""));
        var filter = $"matterId IN [{idList}]";

        var searchQuery = new SearchQuery
        {
            Filter = filter,
            Limit = limit,
            AttributesToCrop = new[] { "content" },
            CropLength = 20,
            AttributesToHighlight = new[] { "content", "originalFileName" },
            HighlightPreTag = "<mark>",
            HighlightPostTag = "</mark>",
        };

        var result = await index.SearchAsync<DocumentSearchEntry>(query, searchQuery);
        return result.Hits.ToList();
    }
}