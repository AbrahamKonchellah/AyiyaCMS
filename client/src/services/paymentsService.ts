// src/services/paymentsService.ts
import api from './api';

export interface InitiatePaymentResponse {
  message: string;
  checkoutRequestId: string;
}

const paymentsService = {
  initiateMpesa: (invoiceId: string) =>
    api.post<InitiatePaymentResponse>('/payments/mpesa/initiate', { invoiceId })
       .then(r => r.data),
};

export default paymentsService;