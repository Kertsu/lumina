# Independent audience boundary

`audience::setup(app.handle())` registers transient output state, lifecycle and
500 ms display monitoring. Native labels are `audience-<workspace UUID>`; URLs
carry `workspaceId`, and native/browser event envelopes identify that workspace.
Audience titles identify the UUID; tab names never become Scripture labels.
Only `main` can mutate windows, projection and restriction. Payload reads require
the requesting window's label to match its requested workspace identity. The
`audience-*` capability grants only event listen/unlisten to these windows.

The TypeScript audience functions take workspace ID first. A per-workspace
operation chain preserves Open/Send/Close order, including removing a tab while
creation is pending. Native creation and closure also serialize against Bible
maintenance. No numeric window limit is imposed. Opening an existing output
focuses it; creating/reopening one starts black with no payload/restriction.
Payloads and restrictions are transient. Failure in one command targets only
its output and is reported back to its initiating controller.

Each native output stores its own monitor signature. Moved/resized/scale events
update its mapping while its prior display remains connected. If macOS/another
OS relocates a window after its old display disappears, mapping retains that old
signature so polling still closes the affected output. Monitor loss or geometry
reconfiguration closes only outputs mapped to that changed signature. Other
outputs continue. Display names/positions/sizes come from Tauri, rather than a
hardware serial-number API; mirrored/identically named displays, rapid changes,
and OS relocation timing require physical qualification. Polling is not a
zero-frame-disconnection guarantee. Main-window destruction closes all outputs;
the operator's graceful path first saves all workspace preparation.

## macOS cursor exclusion implementation

A manual Enable installs a **Session filtering event tap** using the already
pinned safe `core-graphics 0.25` and `core-foundation 0.10` wrappers. Application
`unsafe_code = forbid` remains in place. No tap, permission request, or pointer
change occurs at startup. There is no automatic request for Accessibility:
creation denial returns an actionable System Settings error and leaves the
workspace off. The packaged application needs its own Accessibility grant.

One service composes the **visible portions** of all enabled audiences. On
explicit enable, the service matches its own process's UUID audience title to a
Quartz window ID. Foreign window titles are never needed. Missing identity or
window-server metadata fails explicitly without requesting Screen Recording.
The service retains enabled workspace identities separately from their current
visible regions: a fully covered, minimized or off-desktop audience has no
forbidden region, but its choice remains enabled until released/closed.

A worker refreshes front-to-back onscreen Quartz window metadata every 40 ms.
For each enabled audience it subtracts bounds of all nontransparent windows
above it, including other applications and the operator window. Fully transparent
windows and empty bounds do not occlude. Thus a covering application remains
usable within the audience's old bounds, while uncovered audience portions are
excluded. Window positions, display bounds and pointer events all use Quartz
global top-left logical points; no Tao/backing-scale conversion is mixed in.
Window-server calls and rectangle subtraction happen outside the input callback
and geometry lock; the completed snapshot replaces geometry only if its enabled
identities are still current. Refresh also runs after audience geometry changes. After a completed refresh,
the worker inspects and moves a stationary pointer out of newly exposed audience
content (for example after the covering application is hidden from the keyboard).
It chooses the destination from the latest geometry rather than the scan's old
snapshot; pointer inspection/warping does not hold the geometry lock. Initial
activation defers pointer movement until the event tap has been accepted.
Polling has a bounded refresh interval, not a zero-frame transition guarantee;
window shapes, translucent click-through overlays, Spaces transitions and mixed
scaling require physical qualification.

Incoming pointer movement, drags, mouse buttons and scrolling remain unchanged
outside the visible forbidden pieces, including within covering applications.
When a point needs correction, its destination is the nearest desktop point
outside **all enabled onscreen audiences' full outer bounds**. Those destinations
exclude isolated occluder islands inside an audience: choosing the nearest such
island previously trapped a pointer there as each subsequent movement hit
surrounding restricted audience content. Leaving a covering application's island
now relocates outside the full audience boundary; normal interaction within the
covering application remains unchanged.

An initial pointer inside visible audience content is moved out on activation.
After uncovering, the refresh also relocates a stationary pointer to an exterior
destination. Minimized/off-desktop audiences contribute no outer bounds while
their choices remain enabled. A configuration leaving no exterior desktop region
is rejected on enable; if geometry changes to remove every exterior destination,
restrictions turn off with explicit feedback. Interior islands are never used as
fallback destinations. No keyboard events are intercepted. This engineering
design still needs direct physical pointer qualification; compilation and an
enabled toggle do not prove prevention of visible entry.

Tab/app switches preserve enabled choices, while z-order changes recompute what
is actually visible. Manual release/closure removes only that workspace's
identity and visible pieces; other restrictions remain. Last release stops the
worker and destroys its tap. Reopening/restart has no restriction. Input callbacks
never block on geometry updates: while geometry is locked, the current pointer
event is discarded. Tap timeout/user disable, unavailable metadata or filter
failure clears all choices using that failed service and emits workspace-specific
status errors; operators must enable them again explicitly.
`watchCursorRestriction` combines initial native state with keyed status events,
so UI toggles reset after failure. A closing output also emits restriction off.

The API/source evidence supports a feasible implementation, not a qualified
compatibility claim: [safe tap wrapper source](https://github.com/servo/core-foundation-rs/blob/core-graphics-v0.25.0/core-graphics/src/event.rs),
[Apple tap creation contract](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate(tap:place:options:eventsofinterest:callback:userinfo:)),
and [Apple timeout event](https://developer.apple.com/documentation/coregraphics/cgeventtype/tapdisabledbytimeout).
Global event permissions, revoked permissions, physical displays, mixed scaling,
fullscreen, cross-app movement, simultaneous restrictions and tap failure still
need observation before claiming this configuration supported. In particular,
observe the actual pointer to distinguish pre-entry exclusion from correction.

## Other native candidates and browser preview

Windows/Linux Enable returns an explicit unavailable error without installing a
constraint. Their accepted exclusion requirement remains unfinished. Tauri grab
is deliberately not substituted: window inclusion/fixed lock does not establish
cross-app exclusion. Existing platform evidence is in
[the cursor research](../research/cursor-confinement.md).

Browser preview uses separate named popups and BroadcastChannels keyed by both
operator-session UUID and workspace UUID. Every message also verifies workspace
identity. Closing/reopening a popup clears only its payload. Operator page
closure closes its popups. Native display monitoring, topmost controls and
pointer exclusion remain unavailable in a browser; fullscreen requires a gesture
inside the particular audience popup.

The occlusion regression was directly reproduced in the packaged macOS app:
Room restriction stayed active after another application's window covered Room,
and the pointer remained excluded from that covering application's rectangle.
The previous implementation stored the audience's whole outer bounds and never
consulted z-order. The correction separates enabled identities from visible
regions; the same physical-pointer sequence is the regression check.

Window metadata contracts: [onscreen front-to-back order](https://developer.apple.com/documentation/coregraphics/cgwindowlistoption/optiononscreenonly),
[required metadata keys](https://developer.apple.com/documentation/coregraphics/required-window-list-keys),
and [Apple's window-metadata privacy explanation](https://developer.apple.com/videos/play/wwdc2019/701/?time=1460).
No window image or screen capture API is used by the filter.

A subsequent physical trace confirmed the island failure: on uncover, a pointer
at (725.2,386.1) was successfully warped to (606.5,549), inside an isolated
126-point covering-window region. Further trackpad movement clamped to that
region's edges; switching applications removed the exclusion and freed it.
Both HID/session positions followed the targets, with no warp errors or lock
contention drops. The targeted correction changes relocation destinations while
preserving visible-region hit testing. Temporary debug instrumentation was
removed; the trace and repeatable checks remain local verification artifacts.
The corrected packaged physical sequence remains unverified until rerun.
