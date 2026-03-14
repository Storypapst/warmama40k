import { useActionState, useEffect } from "react";
import type { CounselorApi, CounselorInquiry } from "../api/counselorApi";

interface CounselorPanelProps {
  api: CounselorApi;
  onSubmitted: (result: CounselorInquiry) => void;
}

type FormState = {
  status: "idle" | "success" | "error";
  message: string;
  result: CounselorInquiry | null;
};

const initialState: FormState = {
  status: "idle",
  message: "",
  result: null
};

export function CounselorPanel({ api, onSubmitted }: CounselorPanelProps) {
  const submitAction = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
    const plz = String(formData.get("plz") ?? "").trim();

    try {
      const result = await api.submitInquiry(plz);
      return {
        status: "success",
        message: "Anfrage erfolgreich gesendet.",
        result
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Senden fehlgeschlagen.",
        result: null
      };
    }
  };

  const [state, formAction, isPending] = useActionState(submitAction, initialState);

  useEffect(() => {
    if (state.status === "success" && state.result) {
      onSubmitted(state.result);
    }
  }, [onSubmitted, state.result, state.status]);

  return (
    <section className="panel" aria-label="PLZ Anfrage">
      <h2>Lokalen Berater finden</h2>
      <p className="subtle">Gib deine PLZ ein, um deine Anfrage im lokalen Netzwerk zu platzieren.</p>
      <form action={formAction} className="plz-form">
        <label htmlFor="plz">PLZ</label>
        <input
          id="plz"
          name="plz"
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[0-9]{5}"
          maxLength={5}
          required
          placeholder="z.B. 10115"
        />
        <button type="submit" disabled={isPending}>
          {isPending ? "Sende..." : "Anfrage senden"}
        </button>
      </form>
      {state.status !== "idle" ? <p className={state.status === "error" ? "error" : "success"}>{state.message}</p> : null}
    </section>
  );
}
