using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AyiyaCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMpesaCheckoutRequestIdToInvoice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AddColumn<string>(
                name: "MpesaCheckoutRequestId",
                table: "Invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_FeeNotes_FeeNoteId",
                table: "Invoices",
                column: "FeeNoteId",
                principalTable: "FeeNotes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Users_CreatedById",
                table: "Invoices",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Users_SentById",
                table: "Invoices",
                column: "SentById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
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

            migrationBuilder.DropColumn(
                name: "MpesaCheckoutRequestId",
                table: "Invoices");

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
    }
}
