// AyiyaCMS.Application/Features/Dashboard/DTOs/SystemHealthDto.cs
namespace AyiyaCMS.Application.Features.Dashboard.DTOs;

public class SystemHealthDto
{
    public bool DatabaseOnline    { get; set; }
    public bool StorageOnline     { get; set; }
    public long ApiResponseMs     { get; set; }
    public long StorageUsedBytes  { get; set; }
    public int  ActiveSessions    { get; set; }
}