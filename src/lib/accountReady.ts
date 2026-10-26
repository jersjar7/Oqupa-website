// An account is ready for saves when it is fully set up: email confirmed,
// name, phone verified — the VerifiedGuard rule. Until then a person's hearts
// keep saving in the browser, and the saves move into the account only when
// it is ready (hostile review, 2026-10-25: moving them at sign-up lost them
// when the visitor abandoned the account steps; the app already waited).
interface FirebaseUserLike { emailVerified: boolean }
interface UserLike { name?: string | null; isPhoneVerified?: boolean }

export function isAccountReady(firebaseUser: FirebaseUserLike | null | undefined, user: UserLike | null | undefined): boolean {
  return !!firebaseUser && firebaseUser.emailVerified && !!user?.name && !!user?.isPhoneVerified
}
