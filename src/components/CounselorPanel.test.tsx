import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CounselorPanel } from "./CounselorPanel";

const makeApi = () => ({
  getQueueEstimate: vi.fn(async () => 5),
  submitInquiry: vi.fn(async (plz: string) => ({
    requestId: "REQ-123",
    status: "pending" as const,
    submittedAt: "2026-03-10T12:00:00.000Z",
    plz
  }))
});

describe("CounselorPanel", () => {
  it("submits a valid PLZ and calls onSubmitted", async () => {
    const user = userEvent.setup();
    const api = makeApi();
    const onSubmitted = vi.fn();

    render(<CounselorPanel api={api} onSubmitted={onSubmitted} />);

    await user.type(screen.getByLabelText("PLZ"), "10115");
    await user.click(screen.getByRole("button", { name: /anfrage senden/i }));

    expect(await screen.findByText(/anfrage erfolgreich gesendet/i)).toBeInTheDocument();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(api.submitInquiry).toHaveBeenCalledWith("10115");
  });

  it("renders API errors", async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    const api = {
      getQueueEstimate: vi.fn(async () => 4),
      submitInquiry: vi.fn(async () => {
        throw new Error("Fehler beim Senden");
      })
    };

    render(<CounselorPanel api={api} onSubmitted={onSubmitted} />);

    await user.type(screen.getByLabelText("PLZ"), "123");
    await user.click(screen.getByRole("button", { name: /anfrage senden/i }));

    expect(await screen.findByText(/fehler beim senden/i)).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
