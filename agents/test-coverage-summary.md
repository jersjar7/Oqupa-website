## useInfiniteScroll.ts — 2026-09-10
- Coverage before: 15.74%
- Coverage after:  15.95%
- Tests written:   12 tests covering: ref attachment to sentinel DOM element, IntersectionObserver creation with rootMargin '200px', observe() called with sentinel element, onLoadMore called on intersection when enabled, onLoadMore not called when isIntersecting is false, onLoadMore not called when enabled is false, enabled flag transitions (false→true and true→false), multiple intersections, observer.disconnect() called on unmount, and observer recreation when onLoadMore reference changes

## useRevealedFields.ts — 2026-09-10
- Coverage before: 15.25%
- Coverage after:  15.74%
- Tests written:   19 tests covering skipReveal mode (all fields visible, wasInitial bypass), initial condition seeding, the one-way ratchet (revealed set only grows), progressive reveal on re-render, wasInitial frozen from first render, and edge cases (empty conditions, new fields added after mount)

## useMobileMenu.ts — 2026-09-10
- Coverage before: 15.95%
- Coverage after:  16.63%
- Tests written:   25 tests covering: initial state (isOpen=false, returned API shape), toggle() open/close state transitions, body scroll-lock styles applied on open and cleared on close, body.style.top set to negative scrollY, window.scrollTo called with saved scroll position on close, scroll position captured at open time not close time, close() as standalone function (sets isOpen=false, clears styles, restores scroll, no-throw when already closed), Escape keydown closes menu when open but ignores other keys and does nothing when already closed, resize handler closes when viewport >768px but not at exactly 768px or below, resize ignored when menu is closed, event listener cleanup after unmount (Escape and resize no longer trigger), and effect re-registration across open/close cycles

## useMediaQuery.ts — 2026-09-10
- Coverage before: 16.63%
- Coverage after:  16.84%
- Tests written:   14 tests covering: initial matches=true and matches=false from the matchMedia stub, correct breakpoint query string '(min-width: 768px)' passed to matchMedia, addEventListener called with 'change' and exactly one listener per mount, reactive updates (true→false, false→true, multiple successive events, redundant same-value event), removeEventListener called on unmount with the exact same handler reference that was registered, no-throw after unmount when a change event fires, and removeEventListener called exactly once on unmount

## useScrollHeader.ts — 2026-09-10
- Coverage before: 16.84%
- Coverage after:  17.05%
- Tests written:   13 tests covering: isScrolled starts as false, hook return shape (isScrolled + heroRef), IntersectionObserver created only when heroRef is attached to a real DOM element, rootMargin '0px 0px -60px 0px' passed to observer, threshold 0 passed to observer, observe() called with the hero element, isScrolled set to true when hero is NOT intersecting (scrolled past), isScrolled set to false when hero IS intersecting (scroll back up), remains false when hero starts intersecting, toggles correctly across multiple intersection changes, observer.disconnect() called on unmount, no disconnect when ref is null (no observer created)

## useExpansionPopup.ts — 2026-09-10
- Coverage before: 17.05%
- Coverage after:  17.42%
- Tests written:   21 tests covering: return shape, isReady starts false and becomes true after 5s delay, still false just before delay, timer cleared on unmount, isExpanded=true when localStorage key absent, isExpanded=false when localStorage key present, collapse() sets isExpanded false and persists key to localStorage, collapse() idempotency, expand() sets isExpanded true from collapsed state, expand() does not write to localStorage, expand() idempotency, collapse→expand round-trip, markJoined() does not immediately change isExpanded, markJoined() does not set localStorage before timeout, markJoined() collapses and persists key after SUCCESS_DISPLAY_MS, still expanded just before markJoined timeout fires, and independent firing of isReady (5s) and markJoined (3s) timers

## useMapCameraStorage.ts — 2026-09-10
- Coverage before: 17.42%
- Coverage after:  17.69%
- Tests written:   24 tests covering: return shape (savedCamera + saveCamera fields), null savedCamera when localStorage is empty, reading from the correct storage key (oqupa-map-camera), valid SavedCamera loaded when all three fields are numbers, correct lat/lng/zoom values preserved, null returned for invalid JSON, null returned when any of lat/lng/zoom is missing, null returned when lat/lng/zoom are strings instead of numbers, null for JSON-null and array values, no-throw and null when localStorage.getItem itself throws (SecurityError), saveCamera writes to the correct key, serialises lat+lng+zoom as JSON object, zero and negative coordinates handled correctly, multiple successive saves each write the latest values, no-throw when setItem throws a QuotaExceededError, saveCamera reference is stable across re-renders (useCallback identity), and a full round-trip (save on first mount → reload on second mount returns the saved camera)

## useExploreInteraction.ts — 2026-09-10
- Coverage before: 17.69%
- Coverage after:  18.25%
- Tests written:   35 tests covering: initial state (hoveredId=null, selectedId=null, panelRef, returned API shape), handleMarkerHover non-null id sets hoveredId immediately, updates to new non-null id immediately, null does not clear immediately (75ms debounce), clears after 75ms, still set at 74ms, cancels debounce when new non-null id arrives before timeout fires, double-null resets the debounce window, useCallback stability; handleMarkerClick sets selectedId, updates to new id, sets null, no-throw when panelRef.current is null, calls scrollIntoView with {behavior:'smooth', block:'nearest'} on the matching [data-listing-id] card, skips scrollIntoView when card not found, skips scrollIntoView when null passed, useCallback stability; handleDismiss clears hoveredId, clears selectedId, clears both together, idempotency, clears hoveredId even when debounce timeout is pending, useCallback stability; Escape key listener clears hoveredId, clears selectedId, clears both, ignores non-Escape keys, no-throw with no active state, stops after unmount, remains responsive across multiple state cycles; debounce timer cleanup on unmount does not throw when null timeout was pending at unmount time, no-throw when unmounted before any hover interaction

## authErrors.ts (all functions) — 2026-09-10
- Coverage before: 18.25%
- Coverage after:  ~20%
- Tests written:   47 tests covering all five exported functions: getRegisterAuthError (all 6 codes + fallback + Error.message extraction), getLoginAuthError (all 5 codes + fallback + Error.message + null/string inputs), getPhoneAuthError (all 12 codes + fallback + Error.message), getMagicLinkAuthError (all 6 codes + fallback + Error.message), getForgotPasswordAuthError (all 3 codes + fallback + undefined input)

## listingSchema.ts — 2026-09-10
- Coverage before: ~20%
- Coverage after:  ~20.5%
- Tests written:   65 tests covering step1Schema (propertyType/operationType/role enums, alquiler requires rentalDurationType), step2Schema (description min/max, area positive, bedroomCount/bathroomCount required for casa/departamento/hospedaje, parking min, amenities array max), step3Schema (lat/lng boundary values, required address fields), step4Schema (amount positive, currency enum, maxRealtors 1-5, integer check), fullListingSchema (all fields combined)

## profileSchema.ts + changePasswordSchema — 2026-09-10
- Coverage before: ~20.5%
- Coverage after:  ~20.6%
- Tests written:   20 tests covering profileSchema (name 2-100 chars, preferredContactTimeSlot enum, additionalContactNotes optional up to 500 chars), changePasswordSchema (newPassword min 6 chars, mismatch refine, empty confirmPassword)

## authSchema.ts — 2026-09-10
- Coverage before: ~20.6%
- Coverage after:  ~20.8%
- Tests written:   40 tests covering loginSchema, registerSchema (all 4 password regex rules + mismatch refine), magicLinkSchema, forgotPasswordSchema, setPasswordSchema, nameSchema (min/max), phoneSchema (+51 9-digit / +1 10-digit validation), verificationCodeSchema (6 numeric digits)

## ContentGuard.tsx — 2026-09-10
- Coverage before: ~20.8%
- Coverage after:  ~21%
- Tests written:   12 tests covering loading spinner, dev-only redirect, marketing allowlist rendering, case-insensitive match, isMarketingMemberEmail helper (accepts marketing members, rejects dev-only, null/undefined safe)

## shareUtils.ts — 2026-09-10
- Coverage before: ~21%
- Coverage after:  ~21.05%
- Tests written:   30 tests covering generateShareText (operation label, property type label, venta/alquiler price format, /mes and /noche suffix, bedroom/bathroom singular/plural, area floor, urbanizacion/distrito location line, currency symbols, all-specs vs no-specs), shareListing (navigator.share success, AbortError, non-AbortError fallthrough to clipboard, clipboard success, clipboard failure, text content verification)

## utils.ts — 2026-09-10
- Coverage before: ~21.05%
- Coverage after:  ~21.1%
- Tests written:   14 tests covering formatPrice (zero, undefined, normal price), setReturnUrl/consumeReturnUrl (persist, consume semantics, overwrite, null when empty), getPlatform (iOS/iPad/iPod, Android, desktop, empty UA)

## errorBuffer.ts — 2026-09-10
- Coverage before: ~21.1%
- Coverage after:  ~21.3%
- Tests written:   12 tests covering getCapturedErrors (empty buffer), initErrorBuffer + getCapturedErrors (console.error capture, multiple entries, ISO timestamp format, window 'error' event with/without filename, unhandledrejection with Error/string reason, 1500-char truncation, idempotency, pass-through of original console.error), ring buffer cap (keeps only last 20 entries)

## cardLayout.ts — 2026-09-10
- Coverage before: ~21.3%
- Coverage after:  ~21.4%
- Tests written:   7 tests covering getLayout returns STORY_LAYOUT for 'story' and SQUARE_LAYOUT for 'square', story 9:16 dimensions, square 1:1 dimensions, maxPhotos values, all required CardLayout fields present on both layouts

## useFocusTrap.ts — 2026-09-10
- Coverage before: ~21.4%
- Coverage after:  ~21.5%
- Tests written:   10 tests covering ref attachment, no focus movement when inactive, focus moved to first focusable element on activation, focus restored on deactivation, Tab wraps forward from last to first, Shift+Tab wraps backward from first to last, no preventDefault for middle element Tab, ignores non-Tab keys, no trap with no focusable children, no throw after unmount

## capabilities.ts — 2026-09-10
- Coverage before: ~21.5%
- Coverage after:  ~21.6%
- Tests written:   26 tests covering capabilitiesFor (null/undefined user, unrecognised email, isAdmin, isRealtor, isMetricsViewer, isTeamMember, isMarketingMember, admin full access, case-insensitive), effectiveCapabilities (viewAs=self passthrough, viewAs=asRealtor hides admin shows realtor chrome, viewAs=asOwner hides all privileged chrome)

## navItems.ts — 2026-09-10
- Coverage before: ~21.6%
- Coverage after:  ~21.65%
- Tests written:   26 tests covering getNavGroups (plain owner single group, realtor flat group, admin flat group, admin+realtor three labelled groups, internal staff tabs for team/marketing/metrics members), getMobileNavItems (max 5 items, always starts with dashboard, always ends with miPerfil, role-appropriate items, internal tabs slotted and trimmed)

## useContentLinks.ts (dateKey + daysInMonth) — 2026-09-10
- Coverage before: ~21.65%
- Coverage after:  ~21.69%
- Tests written:   16 tests covering dateKey (0-padded month/day, all edge months), daysInMonth (31-day months, 28/29-day February, 30-day months, first/last element format, YYYY-MM-DD format, consecutive order, 1-indexed month output)
