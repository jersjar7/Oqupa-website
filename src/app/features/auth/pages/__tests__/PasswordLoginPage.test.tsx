// @vitest-environment jsdom
// The entry screen after step 6: one door — Google is the obvious action,
// "Continuar con correo" reveals the form. A mismatch offers both ways forward,
// because production hides whether an email has an account.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockAuthService = vi.hoisted(() => ({
  loginWithEmailAndPassword: vi.fn(),
  signInWithGoogle: vi.fn(),
  getSignInMethods: vi.fn(),
}));
vi.mock("@/services/authService", () => ({ authService: mockAuthService }));
// The real module first, so messages added later need no stand-in here.
vi.mock("@/lib/authErrors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/authErrors")>()),
  getLoginAuthError: vi.fn(() => ({ message: "Credenciales incorrectas" })),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/app/components/ui", () => ({
  Input: ({ label, error, revealToggle: _rt, ...props }: any) => (
    <>
      <input aria-label={label} {...props} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));


// Metrics plan A10: the contact-funnel helpers, so these tests see which
// milestones the page reports (the helpers themselves are tested on their own).
const mockFunnel = vi.hoisted(() => ({
  errand: { at: 123 },
  pendingContactErrand: vi.fn(),
  logContactMilestone: vi.fn(),
}));
vi.mock("@/app/features/listings/contactFunnel", () => ({
  CONTACT_GATE_STEPS: {
    signedIn: "signed_in",
    phoneCodeSent: "phone_code_sent",
    phoneVerified: "phone_verified",
    emailVerified: "email_verified",
  },
  pendingContactErrand: mockFunnel.pendingContactErrand,
  logContactMilestone: mockFunnel.logContactMilestone,
}));

import PasswordLoginPage from "../PasswordLoginPage";

function renderPage(entry = "/app/login") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <PasswordLoginPage />
    </MemoryRouter>,
  );
}
function openEmail() {
  fireEvent.click(
    screen.getByRole("button", { name: /continuar con correo/i }),
  );
}
function fillForm(email = "test@example.com", password = "password123") {
  fireEvent.change(screen.getByRole("textbox", { name: /correo/i }), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/contrase/i), {
    target: { value: password },
  });
}

describe("PasswordLoginPage — the entry screen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers Google first and the email form only on request", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /continuar con google/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /continuar con correo/i }),
    ).toBeDefined();
    expect(screen.queryByRole("textbox", { name: /correo/i })).toBeNull();
    expect(screen.queryByText(/enlace mágico/i)).toBeNull();
  });

  it("Google signs in with one click", async () => {
    mockAuthService.signInWithGoogle.mockResolvedValue({ uid: "g" });
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: /continuar con google/i }),
    );
    await waitFor(() =>
      expect(mockAuthService.signInWithGoogle).toHaveBeenCalled(),
    );
  });

  it("email + password sign in", async () => {
    mockAuthService.loginWithEmailAndPassword.mockResolvedValue({ uid: "u" });
    renderPage();
    openEmail();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await waitFor(() =>
      expect(mockAuthService.loginWithEmailAndPassword).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      ),
    );
  });

  describe("error handling", () => {
    it("shows error message on failed login", async () => {
      mockAuthService.loginWithEmailAndPassword.mockRejectedValue(
        new Error("auth/wrong-password"),
      );
      renderPage();
      openEmail();
      fillForm();
      fireEvent.submit(document.querySelector("form")!);
      await waitFor(() => {
        expect(screen.getByText("Credenciales incorrectas")).toBeDefined();
      });
    });

    it("shows error toast when login fails", async () => {
      const { toast } = vi.mocked(await import("sonner"));
      mockAuthService.loginWithEmailAndPassword.mockRejectedValue(
        new Error("auth/wrong-password"),
      );
      renderPage();
      openEmail();
      fillForm();
      fireEvent.submit(document.querySelector("form")!);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Credenciales incorrectas");
      });
    });

    it("shows error when getSignInMethods itself throws", async () => {
      mockAuthService.getSignInMethods.mockRejectedValue(
        new Error("network-error"),
      );
      renderPage();
      openEmail();
      fillForm();
      fireEvent.submit(document.querySelector("form")!);
      await waitFor(() => {
        expect(screen.getByText("Credenciales incorrectas")).toBeDefined();
      });
    });
    it("a mismatch offers to create the account with that email, or recover the password", async () => {
      mockAuthService.loginWithEmailAndPassword.mockRejectedValue({
        code: "auth/invalid-credential",
      });
      renderPage();
      openEmail();
      fillForm("ana@example.com");
      fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
      await waitFor(() =>
        expect(screen.getByText(/no coinciden/i)).toBeDefined(),
      );
      const create = screen.getByRole("link", {
        name: /crea tu cuenta con este correo/i,
      });
      expect(create.getAttribute("href")).toBe(
        "/app/register?email=ana%40example.com",
      );
      expect(
        screen.getAllByRole("link", { name: /olvidaste tu contraseña/i })
          .length,
      ).toBeGreaterThan(0);
    });

    it("other errors show the mapped message", async () => {
      mockAuthService.loginWithEmailAndPassword.mockRejectedValue({
        code: "auth/network-request-failed",
      });
      renderPage();
      openEmail();
      fillForm();
      fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
      await waitFor(() =>
        expect(screen.getByText(/credenciales incorrectas/i)).toBeDefined(),
      );
    });

    it("?correo=1 opens the email form directly", () => {
      renderPage("/app/login?correo=1");
      expect(screen.getByRole("textbox", { name: /correo/i })).toBeDefined();
    });
  });
});

describe("PasswordLoginPage — contact funnel (A10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFunnel.pendingContactErrand.mockReturnValue(mockFunnel.errand);
  });

  it("Google: reports signed_in for the errand captured before signing in", async () => {
    mockAuthService.signInWithGoogle.mockResolvedValue({ uid: "g" });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /continuar con google/i }));
    await waitFor(() =>
      expect(mockFunnel.logContactMilestone).toHaveBeenCalledWith("signed_in", mockFunnel.errand),
    );
    // Captured before the sign-in, which may already have sent the person back.
    expect(mockFunnel.pendingContactErrand.mock.invocationCallOrder[0]!).toBeLessThan(
      mockAuthService.signInWithGoogle.mock.invocationCallOrder[0]!,
    );
  });

  it("email: reports signed_in after a successful sign-in", async () => {
    mockAuthService.loginWithEmailAndPassword.mockResolvedValue({ uid: "u" });
    renderPage();
    openEmail();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await waitFor(() =>
      expect(mockFunnel.logContactMilestone).toHaveBeenCalledWith("signed_in", mockFunnel.errand),
    );
  });

  it("reports nothing when signing in fails or is cancelled", async () => {
    mockAuthService.loginWithEmailAndPassword.mockRejectedValue({ code: "auth/wrong-password" });
    mockAuthService.signInWithGoogle.mockRejectedValue({ code: "auth/popup-closed-by-user" });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /continuar con google/i }));
    openEmail();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await waitFor(() => expect(mockAuthService.loginWithEmailAndPassword).toHaveBeenCalled());
    expect(mockFunnel.logContactMilestone).not.toHaveBeenCalled();
  });
});

// Email sign-up fix ("Cámbialo"): confirming a new email ends the session, so
// the person lands here and signs in with the new address and the same password.
describe("PasswordLoginPage — after an email change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("opens the email form with the new address filled in and says why", () => {
    renderPage("/app/login?correo=1&cambio=1&email=bien%40x.com");
    expect((screen.getByRole("textbox", { name: /correo/i }) as HTMLInputElement).value).toBe("bien@x.com");
    expect(screen.getByText("Tu correo cambió. Entra con tu nuevo correo y tu contraseña.")).toBeDefined();
  });

  it("forgets the pending change once it has been offered", () => {
    sessionStorage.setItem("oqupa_email_change_v1", JSON.stringify({ email: "bien@x.com", at: Date.now() }));
    renderPage("/app/login?correo=1&cambio=1&email=bien%40x.com");
    expect(sessionStorage.getItem("oqupa_email_change_v1")).toBeNull();
  });

  it("a plain ?email= prefills without the message", () => {
    renderPage("/app/login?correo=1&email=a%40b.co");
    expect((screen.getByRole("textbox", { name: /correo/i }) as HTMLInputElement).value).toBe("a@b.co");
    expect(screen.queryByText(/tu correo cambió/i)).toBeNull();
  });
});
