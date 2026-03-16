export interface CounselorInquiry {
  requestId: string;
  status: "pending";
  submittedAt: string;
  plz: string;
}

export interface CounselorApi {
  getQueueEstimate: () => Promise<number>;
  submitInquiry: (plz: string) => Promise<CounselorInquiry>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export const mockCounselorApi: CounselorApi = {
  async getQueueEstimate() {
    await delay(220);
    const seed = new Date().getMinutes();
    return 3 + (seed % 10);
  },
  async submitInquiry(plz: string) {
    await delay(800 + Math.floor(Math.random() * 500));

    if (!/^\d{5}$/.test(plz)) {
      throw new Error("Bitte gib eine gueltige PLZ mit 5 Ziffern ein.");
    }

    return {
      requestId: `REQ-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      status: "pending",
      submittedAt: new Date().toISOString(),
      plz
    };
  }
};
