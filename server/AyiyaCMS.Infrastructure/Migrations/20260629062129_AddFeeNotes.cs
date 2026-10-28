using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AyiyaCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FeeNoteId",
                table: "TimeEntries",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FeeNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MatterId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeeNoteNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric", nullable: false),
                    VatAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    GeneratedById = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedById = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FileKey = table.Column<string>(type: "text", nullable: false),
                    BucketName = table.Column<string>(type: "text", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeeNotes_Matters_MatterId",
                        column: x => x.MatterId,
                        principalTable: "Matters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FeeNotes_Users_ApprovedById",
                        column: x => x.ApprovedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FeeNotes_Users_GeneratedById",
                        column: x => x.GeneratedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TimeEntries_FeeNoteId",
                table: "TimeEntries",
                column: "FeeNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeNotes_ApprovedById",
                table: "FeeNotes",
                column: "ApprovedById");

            migrationBuilder.CreateIndex(
                name: "IX_FeeNotes_GeneratedById",
                table: "FeeNotes",
                column: "GeneratedById");

            migrationBuilder.CreateIndex(
                name: "IX_FeeNotes_MatterId",
                table: "FeeNotes",
                column: "MatterId");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeEntries_FeeNotes_FeeNoteId",
                table: "TimeEntries",
                column: "FeeNoteId",
                principalTable: "FeeNotes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeEntries_FeeNotes_FeeNoteId",
                table: "TimeEntries");

            migrationBuilder.DropTable(
                name: "FeeNotes");

            migrationBuilder.DropIndex(
                name: "IX_TimeEntries_FeeNoteId",
                table: "TimeEntries");

            migrationBuilder.DropColumn(
                name: "FeeNoteId",
                table: "TimeEntries");
        }
    }
}
