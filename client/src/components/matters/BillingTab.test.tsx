// src/components/matters/BillingTab.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BillingTab from "./BillingTab";

// ---- Mock every external dependency BillingTab pulls in ----

const getForMatterFeeNotesMock = vi.fn();
const generateFeeNoteMock = vi.fn();
const approveFeeNoteMock = vi.fn();
const getDownloadUrlFeeNoteMock = vi.fn();

vi.mock("../../services/feeNoteService", () => ({
  default: {
    getForMatter: (...args: unknown[]) => getForMatterFeeNotesMock(...args),
    generate: (...args: unknown[]) => generateFeeNoteMock(...args),
    approve: (...args: unknown[]) => approveFeeNoteMock(...args),
    getDownloadUrl: (...args: unknown[]) => getDownloadUrlFeeNoteMock(...args),
  },
}));

const getForMatterInvoicesMock = vi.fn();
const generateInvoiceMock = vi.fn();
const markSentMock = vi.fn();
const markPaidMock = vi.fn();
const getDownloadUrlInvoiceMock = vi.fn();

vi.mock("../../services/InvoiceService", () => ({
  default: {
    getForMatter: (...args: unknown[]) => getForMatterInvoicesMock(...args),
    generate: (...args: unknown[]) => generateInvoiceMock(...args),
    markSent: (...args: unknown[]) => markSentMock(...args),
    markPaid: (...args: unknown[]) => markPaidMock(...args),
    getDownloadUrl: (...args: unknown[]) => getDownloadUrlInvoiceMock(...args),
  },
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const toastWarningMock = vi.fn();

vi.mock("../auth/Toast", () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
    warning: toastWarningMock,
  }),
}));

const confirmMock = vi.fn();

vi.mock("../auth/ConfirmDialog", () => ({
  useConfirm: () => confirmMock,
}));

const useAuthMock = vi.fn();

vi.mock("../../store/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

// ---- Fixtures ----

const pendingFeeNote = {
  id: "fn-1",
  matterId: "matter-1",
  matterTitle: "Test Matter",
  feeNoteNumber: "FN-2026-0001",
  subtotal: 10000,
  vatAmount: 1600,
  totalAmount: 11600,
  status: "PendingApproval",
  generatedByName: "Test Lawyer",
  approvedByName: null,
  approvedAt: null,
  generatedAt: "2026-06-01T00:00:00Z",
};

const approvedFeeNote = {
  ...pendingFeeNote,
  id: "fn-2",
  feeNoteNumber: "FN-2026-0002",
  status: "Approved",
  approvedByName: "Partner Jane",
};

const draftInvoice = {
  id: "inv-1",
  clientName: "Test Client",
  feeNoteId: "fn-2",
  invoiceNumber: "INV-2026-0001",
  amount: 11600,
  issuedAt: "2026-06-02T00:00:00Z",
  dueDate: "2026-06-16T00:00:00Z",
  status: "Draft",
  sentByName: null,
  mpesaReceiptNumber: null,
};

function setAuthRole(role: string | null) {
  useAuthMock.mockReturnValue({ user: role ? { id: "u1", role } : null });
}

async function renderBillingTab(feeNotes: unknown[] = [], invoices: unknown[] = []) {
  getForMatterFeeNotesMock.mockResolvedValue(feeNotes);
  getForMatterInvoicesMock.mockResolvedValue(invoices);
  const utils = render(<BillingTab matterId="matter-1" />);
  await waitFor(() => expect(getForMatterFeeNotesMock).toHaveBeenCalledWith("matter-1"));
  return utils;
}

describe("BillingTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty-state messaging when there are no fee notes or invoices", async () => {
    setAuthRole("Client");
    await renderBillingTab([], []);

    expect(await screen.findByText("No fee notes yet")).toBeInTheDocument();
    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
  });

  describe("role-based visibility", () => {
    it("hides all action buttons for a Client", async () => {
      setAuthRole("Client");
      await renderBillingTab([pendingFeeNote], [draftInvoice]);

      await screen.findByText("FN-2026-0001");
      expect(screen.queryByRole("button", { name: /generate fee note/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /create invoice/i })).not.toBeInTheDocument();
    });

    it("shows Generate and Create Invoice for a Partner, plus Approve on pending fee notes", async () => {
      setAuthRole("Partner");
      await renderBillingTab([pendingFeeNote], []);

      expect(await screen.findByRole("button", { name: /generate fee note/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create invoice/i })).toBeInTheDocument();
      expect(screen.getByTitle("Approve")).toBeInTheDocument();
    });

    it("does not show Approve for an Associate", async () => {
      setAuthRole("Associate");
      await renderBillingTab([pendingFeeNote], []);

      await screen.findByText("FN-2026-0001");
      expect(screen.queryByTitle("Approve")).not.toBeInTheDocument();
    });
  });

  describe("fee note actions", () => {
    it("generates a fee note and reloads the list", async () => {
      setAuthRole("Partner");
      await renderBillingTab([], []);
      generateFeeNoteMock.mockResolvedValue({
        feeNoteNumber: "FN-2026-0003",
        totalAmount: 5000,
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /generate fee note/i }));

      await waitFor(() => expect(generateFeeNoteMock).toHaveBeenCalledWith("matter-1"));
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Fee note generated",
        expect.stringContaining("FN-2026-0003")
      );
      // loadAll runs again after generating
      expect(getForMatterFeeNotesMock).toHaveBeenCalledTimes(2);
    });

    it("shows a server error message when fee note generation fails", async () => {
      setAuthRole("Partner");
      await renderBillingTab([], []);
      generateFeeNoteMock.mockRejectedValue({
        response: { data: { message: "No unbilled time entries on this matter." } },
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /generate fee note/i }));

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith(
          "Could not generate fee note",
          "No unbilled time entries on this matter."
        );
      });
    });

    it("approves a fee note only after the user confirms the dialog", async () => {
      setAuthRole("Partner");
      await renderBillingTab([pendingFeeNote], []);
      confirmMock.mockResolvedValue(true);
      approveFeeNoteMock.mockResolvedValue(true);

      const user = userEvent.setup();
      await user.click(await screen.findByTitle("Approve"));

      expect(confirmMock).toHaveBeenCalled();
      await waitFor(() => expect(approveFeeNoteMock).toHaveBeenCalledWith("fn-1"));
      expect(toastSuccessMock).toHaveBeenCalledWith("Fee note approved", "");
    });

    it("does not approve when the user cancels the confirm dialog", async () => {
      setAuthRole("Partner");
      await renderBillingTab([pendingFeeNote], []);
      confirmMock.mockResolvedValue(false);

      const user = userEvent.setup();
      await user.click(await screen.findByTitle("Approve"));

      expect(confirmMock).toHaveBeenCalled();
      expect(approveFeeNoteMock).not.toHaveBeenCalled();
    });
  });

  describe("invoice creation", () => {
    it("warns instead of opening the modal when no approved, uninvoiced fee notes exist", async () => {
      setAuthRole("Partner");
      await renderBillingTab([pendingFeeNote], []); // pending, not approved

      const user = userEvent.setup();
      await user.click(await screen.findByRole("button", { name: /create invoice/i }));

      expect(toastWarningMock).toHaveBeenCalledWith(
        "No fee notes available",
        expect.stringContaining("Approve a fee note first")
      );
      expect(screen.queryByText("Create Invoice", { selector: "h2" })).not.toBeInTheDocument();
    });

    it("opens the modal and creates an invoice from an approved fee note", async () => {
      setAuthRole("Partner");
      await renderBillingTab([approvedFeeNote], []);
      generateInvoiceMock.mockResolvedValue({
        invoiceNumber: "INV-2026-0002",
        amount: 11600,
      });

      const user = userEvent.setup();
      await user.click(await screen.findByRole("button", { name: /create invoice/i }));

      const modal = await screen.findByText("Create Invoice", { selector: "h2" });
      expect(modal).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /^create invoice$/i }));

      await waitFor(() => {
        expect(generateInvoiceMock).toHaveBeenCalledWith(
          expect.objectContaining({ feeNoteId: "fn-2" })
        );
      });
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Invoice created",
        expect.stringContaining("INV-2026-0002")
      );
    });
  });

  describe("invoice lifecycle actions", () => {
    it("sends a draft invoice after confirmation", async () => {
      setAuthRole("Partner");
      await renderBillingTab([], [draftInvoice]);
      confirmMock.mockResolvedValue(true);
      markSentMock.mockResolvedValue(true);

      const user = userEvent.setup();
      await user.click(await screen.findByTitle("Send to client"));

      await waitFor(() => expect(markSentMock).toHaveBeenCalledWith("inv-1"));
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Invoice sent",
        expect.stringContaining("INV-2026-0001")
      );
    });

    it("does not show Send to client for an Associate (Partner/Admin only)", async () => {
      setAuthRole("Associate");
      await renderBillingTab([], [draftInvoice]);

      await screen.findByText("INV-2026-0001");
      expect(screen.queryByTitle("Send to client")).not.toBeInTheDocument();
    });

    it("records a manual payment after confirmation", async () => {
      const sentInvoice = { ...draftInvoice, status: "Sent", sentByName: "Partner Jane" };
      setAuthRole("Partner");
      await renderBillingTab([], [sentInvoice]);
      confirmMock.mockResolvedValue(true);
      markPaidMock.mockResolvedValue(true);

      const user = userEvent.setup();
      await user.click(await screen.findByTitle("Record manual payment"));

      await waitFor(() => expect(markPaidMock).toHaveBeenCalledWith("inv-1"));
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "Payment recorded",
        expect.stringContaining("INV-2026-0001")
      );
    });

    it("shows the M-Pesa receipt number on a paid invoice", async () => {
      const paidInvoice = { ...draftInvoice, status: "Paid", mpesaReceiptNumber: "NLJ7RT61SV" };
      setAuthRole("Partner");
      await renderBillingTab([], [paidInvoice]);

      expect(await screen.findByText(/M-Pesa: NLJ7RT61SV/)).toBeInTheDocument();
    });
  });
});