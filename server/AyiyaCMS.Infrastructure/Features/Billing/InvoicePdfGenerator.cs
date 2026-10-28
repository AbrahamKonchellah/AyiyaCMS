// AyiyaCMS.Infrastructure/Features/Billing/InvoicePdfGenerator.cs
using AyiyaCMS.Infrastructure.Configuration;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AyiyaCMS.Infrastructure.Features.Billing;

public static class InvoicePdfGenerator
{
    public static byte[] Generate(
        FirmSettings firm,
        string invoiceNumber,
        DateTime issuedAt,
        DateTime dueDate,
        string? matterTitle,
        string? jicmsCaseNumber,
        string feeNoteNumber,
        string clientName,
        string? clientAddress,
        decimal subtotal,
        decimal vatAmount,
        decimal vatRate,
        decimal totalAmount)
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
                        row.RelativeItem().Text("INVOICE").FontSize(16).Bold().FontColor(Colors.Blue.Darken2);
                        row.RelativeItem().AlignRight().Column(c =>
                        {
                            c.Item().Text($"Invoice No: {invoiceNumber}");
                            c.Item().Text($"Date Issued: {issuedAt:dd MMMM yyyy}");
                            c.Item().Text($"Due Date: {dueDate:dd MMMM yyyy}").Bold();
                        });
                    });

                    if (!string.IsNullOrWhiteSpace(matterTitle))
                        col.Item().Text($"RE: {matterTitle}").Bold();
                    if (!string.IsNullOrWhiteSpace(jicmsCaseNumber))
                        col.Item().Text($"Case No: {jicmsCaseNumber}");
                    col.Item().Text($"Ref. Fee Note: {feeNoteNumber}").FontSize(9).FontColor(Colors.Grey.Darken1);

                    col.Item().PaddingTop(5).Text("BILL TO:").Bold();
                    col.Item().Text(clientName);
                    if (!string.IsNullOrWhiteSpace(clientAddress))
                        col.Item().Text(clientAddress);

                    col.Item().PaddingTop(15).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(4);
                            columns.ConstantColumn(100);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Text("Description").Bold();
                            header.Cell().AlignRight().Text("Amount").Bold();
                            header.Cell().ColumnSpan(2).PaddingTop(3).BorderBottom(1);
                        });

                        table.Cell().PaddingVertical(4).Text($"Professional fees rendered — see {feeNoteNumber}");
                        table.Cell().PaddingVertical(4).AlignRight().Text($"KES {subtotal:N2}");
                    });

                    col.Item().PaddingTop(10).AlignRight().Column(c =>
                    {
                        c.Item().Row(r => { r.RelativeItem().AlignRight().Text("Subtotal:"); r.ConstantItem(100).AlignRight().Text($"KES {subtotal:N2}"); });
                        c.Item().Row(r => { r.RelativeItem().AlignRight().Text($"VAT ({vatRate:P0}):"); r.ConstantItem(100).AlignRight().Text($"KES {vatAmount:N2}"); });
                        c.Item().PaddingTop(4).BorderTop(1).Row(r =>
                        {
                            r.RelativeItem().AlignRight().Text("Amount Due:").Bold().FontSize(12);
                            r.ConstantItem(100).AlignRight().Text($"KES {totalAmount:N2}").Bold().FontSize(12);
                        });
                    });

                    col.Item().PaddingTop(30).Background(Colors.Green.Lighten4).Padding(10).Column(c =>
                    {
                        c.Item().Text("Payment Instructions").Bold().FontSize(10);
                        c.Item().Text("Pay via M-Pesa directly from your client portal, or bank transfer to the account below.").FontSize(8.5f);
                    });

                    col.Item().PaddingTop(20).Text(text =>
                    {
                        text.Span("Please note: ").Bold().FontSize(8);
                        text.Span("Payment is due by the date shown above. Late payment may attract interest per the engagement letter terms.")
                            .FontSize(8).FontColor(Colors.Grey.Darken1);
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span($"{firm.Name} — Generated electronically and valid without signature.")
                        .FontSize(7).FontColor(Colors.Grey.Medium);
                });
            });
        });

        return document.GeneratePdf();
    }
}