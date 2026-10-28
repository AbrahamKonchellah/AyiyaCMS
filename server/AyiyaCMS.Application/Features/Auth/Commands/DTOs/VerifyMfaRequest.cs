// AyiyaCMS.Application/Features/Auth/DTOs/VerifyMfaRequest.cs
namespace AyiyaCMS.Application.Features.Auth.DTOs;

public record VerifyMfaRequest(string Email, string Code);