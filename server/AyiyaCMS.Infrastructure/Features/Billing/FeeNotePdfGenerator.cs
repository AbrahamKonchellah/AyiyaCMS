// AyiyaCMS.Infrastructure/Features/Billing/FeeNotePdfGenerator.cs
using AyiyaCMS.Infrastructure.Configuration;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AyiyaCMS.Infrastructure.Features.Billing;

public class FeeNoteLineItem
{
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Hours { get; set; }
    public decimal Rate { get; set; }
    public decimal Amount { get; set; }
}

public static class FeeNotePdfGenerator
{
    public static byte[] Generate(
        FirmSettings firm,
        string feeNoteNumber,
        DateTime generatedAt,
        string matterTitle,
        string jicmsCaseNumber,
        string clientName,
        string? clientAddress,
        List<FeeNoteLineItem> lineItems,
        decimal subtotal,
        decimal vatAmount,
        decimal totalAmount,
        decimal vatRate,
        string advocateName)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text(firm.Name).FontSize(18).Bold();
                    col.Item().Text(firm.Address).FontSize(9);
                    col.Item().Text($"Tel: {firm.Phone}  ·  Email: {firm.Email}").FontSize(9);
                    col.Item().Text($"VAT PIN: {firm.VatPin}").FontSize(9);
                    col.Item().PaddingTop(10).LineHorizontal(1);
                });

                page.Content().Column(col =>
                {
                    col.Spacing(10);

                    col.Item().PaddingTop(15).Row(row =>
                    {
                        row.RelativeItem().Text("FEE NOTE").FontSize(14).Bold();
                        row.RelativeItem().AlignRight().Column(c =>
                        {
                            c.Item().Text($"No: {feeNoteNumber}");
                            c.Item().Text($"Date: {generatedAt:dd MMMM yyyy}");
                        });
                    });

                    col.Item().Text($"RE: {matterTitle}").Bold();
                    if (!string.IsNullOrWhiteSpace(jicmsCaseNumber))
                        col.Item().Text($"Case No: {jicmsCaseNumber}");

                    col.Item().PaddingTop(5).Text("TO:").Bold();
                    col.Item().Text(clientName);
                    if (!string.IsNullOrWhiteSpace(clientAddress))
                        col.Item().Text(clientAddress);

                    col.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(70);
                            columns.RelativeColumn(3);
                            columns.ConstantColumn(50);
                            columns.ConstantColumn(70);
                            columns.ConstantColumn(80);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Text("Date").Bold();
                            header.Cell().Text("Description").Bold();
                            header.Cell().AlignRight().Text("Hours").Bold();
                            header.Cell().AlignRight().Text("Rate").Bold();
                            header.Cell().AlignRight().Text("Amount").Bold();
                            header.Cell().ColumnSpan(5).PaddingTop(3).BorderBottom(1);
                        });

                        foreach (var item in lineItems)
                        {
                            table.Cell().PaddingVertical(3).Text(item.Date.ToString("dd MMM yyyy"));
                            table.Cell().PaddingVertical(3).Text(item.Description);
                            table.Cell().PaddingVertical(3).AlignRight().Text(item.Hours.ToString("0.00"));
                            table.Cell().PaddingVertical(3).AlignRight().Text(item.Rate.ToString("N2"));
                            table.Cell().PaddingVertical(3).AlignRight().Text(item.Amount.ToString("N2"));
                        }
                    });

                    col.Item().PaddingTop(10).AlignRight().Column(c =>
                    {
                        c.Item().Row(r => { r.RelativeItem().AlignRight().Text("Subtotal:"); r.ConstantItem(90).AlignRight().Text($"KES {subtotal:N2}"); });
                        c.Item().Row(r => { r.RelativeItem().AlignRight().Text($"VAT ({vatRate:P0}):"); r.ConstantItem(90).AlignRight().Text($"KES {vatAmount:N2}"); });
                        c.Item().PaddingTop(3).BorderTop(1).Row(r =>
                        {
                            r.RelativeItem().AlignRight().Text("Total Due:").Bold();
                            r.ConstantItem(90).AlignRight().Text($"KES {totalAmount:N2}").Bold();
                        });
                    });

                    col.Item().PaddingTop(40).Column(c =>
                    {
                        c.Item().Text("For and on behalf of:");
                        c.Item().PaddingTop(20).Text(firm.Name).Bold();
                        c.Item().Text(advocateName);
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Computed on the agreed hourly rate basis (Schedule 5, Part I, Advocates (Remuneration) Order).")
                        .FontSize(7).FontColor(Colors.Grey.Medium);
                });
            });
        });

        return document.GeneratePdf();
    }
}