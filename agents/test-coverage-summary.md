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
