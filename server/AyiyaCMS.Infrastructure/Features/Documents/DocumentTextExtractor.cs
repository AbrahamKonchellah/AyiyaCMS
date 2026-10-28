using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using UglyToad.PdfPig;

namespace AyiyaCMS.Infrastructure.Features.Documents;

public static class DocumentTextExtractor
{
    private const int MaxChars = 50_000;

    public static string Extract(byte[] fileBytes, string contentType, string fileName)
    {
        try
        {
            if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase))
                return Truncate(ExtractPdf(fileBytes));

            if (contentType.Contains("wordprocessingml", StringComparison.OrdinalIgnoreCase) ||
                fileName.EndsWith(".docx", StringComparison.OrdinalIgnoreCase))
                return Truncate(ExtractDocx(fileBytes));

            return string.Empty; // Excel, images etc — indexed by filename only
        }
        catch
        {
            return string.Empty; // Corrupt file won't block the upload
        }
    }

    private static string ExtractPdf(byte[] bytes)
    {
        using var ms = new MemoryStream(bytes);
        using var document = PdfDocument.Open(ms);
        var sb = new System.Text.StringBuilder();
        foreach (var page in document.GetPages())
            sb.AppendLine(page.Text);
        return sb.ToString();
    }

    private static string ExtractDocx(byte[] bytes)
    {
        using var ms = new MemoryStream(bytes);
        using var wordDoc = WordprocessingDocument.Open(ms, false);
        var body = wordDoc.MainDocumentPart?.Document?.Body;
        if (body == null) return string.Empty;

        var sb = new System.Text.StringBuilder();
        foreach (var paragraph in body.Descendants<Paragraph>())
            sb.AppendLine(paragraph.InnerText);
        return sb.ToString();
    }

    private static string Truncate(string text) =>
        text.Length > MaxChars ? text[..MaxChars] : text;
}