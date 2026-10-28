using System.Runtime.CompilerServices;

namespace AyiyaCMS.Tests;

internal static class TestSetup
{
    [ModuleInitializer]
    public static void Init()
    {
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }
}