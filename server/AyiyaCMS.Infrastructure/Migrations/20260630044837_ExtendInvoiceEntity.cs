using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AyiyaCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ExtendInvoiceEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BucketName",
                table: "Invoices",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedById",
                table: "Invoices",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "FeeNoteId",
                table: "Invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileKey",
                table: "Invoices",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InvoiceNumber",
                table: "Invoices",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MpesaReceiptNumber",
                table: "Invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaidAt",
                table: "Invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SentAt",
                table: "Invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SentById",
                table: "Invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_CreatedById",
                table: "Invoices",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_FeeNoteId",
                table: "Invoices",
                column: "FeeNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_SentById",
                table: "Invoices",
                column: "SentById");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_FeeNotes_FeeNoteId",
                table: "Invoices",
                column: "FeeNoteId",
                principalTable: "FeeNotes",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Users_CreatedById",
                table: "Invoices",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Users_SentById",
                table: "Invoices",
                column: "SentById",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_FeeNotes_FeeNoteId",
                table: "Invoices");

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Users_CreatedById",
                table: "Invoices");

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Users_SentById",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_CreatedById",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_FeeNoteId",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_SentById",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "BucketName",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "FeeNoteId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "FileKey",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "InvoiceNumber",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "MpesaReceiptNumber",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "PaidAt",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "SentAt",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "SentById",
                table: "Invoices");
        }
    }
}
