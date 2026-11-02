// @vitest-environment jsdom
// The entry screen after step 6: one door — Google is the obvious action,
// "Continuar con correo" reveals the form. A mismatch offers both ways forward,
// because production hides whether an email has an account.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

// ADR-043 decision 7: "¿Nueva en Oqupa?" spoke to women only; it now reads
// "¿Primera vez en Oqupa?". Only the words change: same links, same order.
describe("PasswordLoginPage — wording for everyone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFunnel.pendingContactErrand.mockReturnValue(null);
  });

  it('the create-account link says "¿Primera vez en Oqupa?"', () => {
    renderPage();
    const link = screen.getByRole("link", { name: "¿Primera vez en Oqupa? Crea tu cuenta" });
    expect(link.getAttribute("href")).toBe("/app/register");
    expect(document.body.textContent).not.toMatch(/Nueva en Oqupa/);
  });

  it("after a mismatch, the same words lead to sign-up with the email", async () => {
    mockAuthService.loginWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential" });
    renderPage();
    openEmail();
    fillForm("ana@example.com");
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    const link = await screen.findByRole("link", { name: "¿Primera vez en Oqupa? Crea tu cuenta con este correo" });
    expect(link.getAttribute("href")).toBe("/app/register?email=ana%40example.com");
    expect(document.body.textContent).not.toMatch(/Nueva en Oqupa/);
  });
});
