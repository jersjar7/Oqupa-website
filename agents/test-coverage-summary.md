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
