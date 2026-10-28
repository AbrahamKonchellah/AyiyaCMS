namespace AyiyaCMS.Application.Features.Payments.DTOs;

public record InitiateStkPushRequest(Guid InvoiceId);

public record InitiateStkPushResult(
    bool Success,
    string? CheckoutRequestId,
    string? MerchantRequestId,
    string? ErrorMessage
);

// Shape of Safaricom's callback POST body
public record MpesaCallbackEnvelope(MpesaCallbackBody Body);

public record MpesaCallbackBody(MpesaStkCallback stkCallback);

public record MpesaStkCallback(
    string MerchantRequestID,
    string CheckoutRequestID,
    int ResultCode,
    string ResultDesc,
    MpesaCallbackMetadata? CallbackMetadata
);

public record MpesaCallbackMetadata(List<MpesaCallbackItem> Item);

public record MpesaCallbackItem(string Name, object? Value);