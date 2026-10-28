using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AyiyaCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddResetToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PasswordExpiresAt",
                table: "Users",
                newName: "ResetTokenExpiry");

            migrationBuilder.AddColumn<string>(
                name: "ResetToken",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResetToken",
                table: "Users");

            migrationBuilder.RenameColumn(
                name: "ResetTokenExpiry",
                table: "Users",
                newName: "PasswordExpiresAt");
        }
    }
}
