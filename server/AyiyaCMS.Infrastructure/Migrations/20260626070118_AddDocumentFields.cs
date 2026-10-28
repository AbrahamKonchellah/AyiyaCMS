using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AyiyaCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Matters_MatterId",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Users_UploadedById",
                table: "Documents");

            migrationBuilder.AlterColumn<string>(
                name: "FileName",
                table: "Documents",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "ContentType",
                table: "Documents",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "Checksum",
                table: "Documents",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "FileSizeBytes",
                table: "Documents",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "OriginalFileName",
                table: "Documents",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "Documents",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Matters_MatterId",
                table: "Documents",
                column: "MatterId",
                principalTable: "Matters",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Users_UploadedById",
                table: "Documents",
                column: "UploadedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Matters_MatterId",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Users_UploadedById",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Checksum",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "FileSizeBytes",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "OriginalFileName",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Documents");

            migrationBuilder.AlterColumn<string>(
                name: "FileName",
                table: "Documents",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "ContentType",
                table: "Documents",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Matters_MatterId",
                table: "Documents",
                column: "MatterId",
                principalTable: "Matters",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Users_UploadedById",
                table: "Documents",
                column: "UploadedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
