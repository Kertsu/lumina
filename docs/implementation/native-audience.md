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

One service composes all enabled audiences' global outer rectangles. Quartz
coordinates are logical top-left global points; Tao's window positions/sizes are
converted using that window's backing scale. Connected-display regions minus
all enabled rectangles form permitted regions. Incoming pointer movement,
drags, mouse buttons and scrolling remain unchanged outside these rectangles.
Inside, the filter chooses the nearest permitted point and forwards a replaced
event while keeping physical pointer position at that point. An initial pointer
inside an audience is moved out on activation. A configuration leaving no
permitted desktop region is rejected. No keyboard events are intercepted.
This engineering design still needs direct physical-pointer qualification;
compilation and an enabled toggle do not prove prevention of visible entry.

Window movement, resizing, scale and fullscreen transitions refresh geometry.
Tab/app switches do not turn the service off. Manual release/closure removes
only that workspace's rectangle; other restrictions remain. Last release stops
the worker and destroys its tap. Reopening/restart has no restriction. Input
callbacks never block on geometry updates: while geometry is locked, the current
pointer event is discarded. Tap timeout/user disable or filter failure clears
all choices using that failed service and emits workspace-specific status errors;
operators must enable them again explicitly. `watchCursorRestriction` combines
initial native state with keyed status events, so UI toggles reset after failure.
A closing output also emits restriction off.

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
