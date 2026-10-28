CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;
CREATE TABLE "AuditLogs" (
    "Id" uuid NOT NULL,
    "EntityName" text NOT NULL,
    "EntityId" text NOT NULL,
    "Action" text NOT NULL,
    "PerformedBy" text NOT NULL,
    "PerformedAt" timestamp with time zone NOT NULL,
    "Changes" text NOT NULL,
    CONSTRAINT "PK_AuditLogs" PRIMARY KEY ("Id")
);

CREATE TABLE "Clients" (
    "Id" uuid NOT NULL,
    "Name" character varying(255) NOT NULL,
    "Email" character varying(255) NOT NULL,
    "Phone" text NOT NULL,
    "Address" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Clients" PRIMARY KEY ("Id")
);

CREATE TABLE "Users" (
    "Id" uuid NOT NULL,
    "FirstName" character varying(100) NOT NULL,
    "LastName" character varying(100) NOT NULL,
    "Email" character varying(255) NOT NULL,
    "PasswordHash" text NOT NULL,
    "Role" character varying(50) NOT NULL,
    "IsActive" boolean NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    "MfaEnabled" boolean NOT NULL,
    "MfaSecret" text,
    "RefreshToken" text,
    "RefreshTokenExpiry" timestamp with time zone,
    CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
);

CREATE TABLE "Matters" (
    "Id" uuid NOT NULL,
    "Title" text NOT NULL,
    "JICMSCaseNumber" text NOT NULL,
    "CourtStation" text NOT NULL,
    "HearingDate" timestamp with time zone,
    "FilingDeadline" timestamp with time zone,
    "Status" text NOT NULL,
    "ClientId" uuid NOT NULL,
    "AssignedLawyerId" uuid,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Matters" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Matters_Clients_ClientId" FOREIGN KEY ("ClientId") REFERENCES "Clients" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Matters_Users_AssignedLawyerId" FOREIGN KEY ("AssignedLawyerId") REFERENCES "Users" ("Id") ON DELETE SET NULL
);

CREATE TABLE "Documents" (
    "Id" uuid NOT NULL,
    "FileName" text NOT NULL,
    "FileKey" text NOT NULL,
    "ContentType" text NOT NULL,
    "BucketName" text NOT NULL,
    "UploadedById" uuid NOT NULL,
    "MatterId" uuid,
    "UploadedAt" timestamp with time zone NOT NULL,
    "ClientId" uuid,
    CONSTRAINT "PK_Documents" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Documents_Clients_ClientId" FOREIGN KEY ("ClientId") REFERENCES "Clients" ("Id"),
    CONSTRAINT "FK_Documents_Matters_MatterId" FOREIGN KEY ("MatterId") REFERENCES "Matters" ("Id"),
    CONSTRAINT "FK_Documents_Users_UploadedById" FOREIGN KEY ("UploadedById") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Invoices" (
    "Id" uuid NOT NULL,
    "ClientId" uuid NOT NULL,
    "MatterId" uuid,
    "Amount" numeric NOT NULL,
    "IssuedAt" timestamp with time zone NOT NULL,
    "DueDate" timestamp with time zone NOT NULL,
    "Status" text NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Invoices" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Invoices_Clients_ClientId" FOREIGN KEY ("ClientId") REFERENCES "Clients" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Invoices_Matters_MatterId" FOREIGN KEY ("MatterId") REFERENCES "Matters" ("Id")
);

CREATE TABLE "TimeEntries" (
    "Id" uuid NOT NULL,
    "MatterId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Description" text NOT NULL,
    "Hours" numeric NOT NULL,
    "Rate" numeric NOT NULL,
    "IsBilled" boolean NOT NULL,
    "EntryDate" timestamp with time zone NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_TimeEntries" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_TimeEntries_Matters_MatterId" FOREIGN KEY ("MatterId") REFERENCES "Matters" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TimeEntries_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_Documents_ClientId" ON "Documents" ("ClientId");

CREATE INDEX "IX_Documents_MatterId" ON "Documents" ("MatterId");

CREATE INDEX "IX_Documents_UploadedById" ON "Documents" ("UploadedById");

CREATE INDEX "IX_Invoices_ClientId" ON "Invoices" ("ClientId");

CREATE INDEX "IX_Invoices_MatterId" ON "Invoices" ("MatterId");

CREATE INDEX "IX_Matters_AssignedLawyerId" ON "Matters" ("AssignedLawyerId");

CREATE INDEX "IX_Matters_ClientId" ON "Matters" ("ClientId");

CREATE INDEX "IX_TimeEntries_MatterId" ON "TimeEntries" ("MatterId");

CREATE INDEX "IX_TimeEntries_UserId" ON "TimeEntries" ("UserId");

CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260614143301_InitialCreate', '9.0.0');

COMMIT;

