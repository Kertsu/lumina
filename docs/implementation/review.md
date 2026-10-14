# Prototype implementation review

Baseline: `472b371`; integration branch: `1st-prototype-Kurtd-Daniel-Bigtas`.
Standards and specification reviewed independently in parallel. No automated
test files were added or modified, following repository verification policy.

## Standards

No documented-standard violations found. One nonblocking judgment:
possible duplicated/speculative appearance helpers alongside VerseSlide's
renderer. Removed unused exports; operator and audience share VerseSlide.

## Spec

Two actionable defects found and corrected in `1d85eca`:

- Accepted large background images could exceed the workspace JSON limit,
  blocking subsequent saves and closure. SQLite workspace records now contain
  content-addressed managed image references; runtime loading hydrates them.
  Missing/corrupt managed files fall back to the translation background color.
- Background editing could target the selected search translation while the
  private appearance slide showed another translation. Controls now target and
  label the private preview's translation.

Additional correction: current queue/search previews re-resolve their own
translation/reference after maintenance; removed/missing coordinates cannot
project. Only an explicitly selected history entry may re-project its saved
wording after its original edition is removed/replaced.

Native verification found two further issues:

- Applying while a large background image loaded could lose the image. Apply
  now waits for loading; closing the dialog invalidates late picker responses.
  The disabled Apply state and subsequent successful application were observed.
- Five publisher WEB rows contain no wording. They now remain unavailable;
  all 31,098 nonempty verses retain their original text. Duplicate import
  comparison uses a shared canonical content digest, while the bundled edition
  keeps its publisher artifact identity. These final changes passed static and
  package checks; native follow-up requires an unlocked Mac.

The supplied `bible-content.db` was selected in the native import dialog and
rejected by the 128 MiB limit: 466,980,864 bytes (about 445 MiB). Read-only
inspection also found legacy schema version 0, 106 translations, and 3,296,918
verses, beyond the current contract/capacity. Its SHA-256 was identical before
and after the attempt. No conversion or source mutation was performed.

## Remaining acceptance work

This is a prototype, not a completed qualified release.

- Native cursor restriction is unimplemented. Activation returns explicit
  feedback and remains off. Built-in cursor grab does not satisfy audience
  exclusion across application switches. Platform integration and direct
  physical-pointer evidence remain required.
- Physical extended-display placement/disconnection, cross-application pointer
  behavior, and the 60-minute packaged offline rehearsal remain unverified.
  Windows, Linux/X11/Wayland, Intel macOS, and baseline OS versions have no
  supported-release claim from this implementation.
- Final UI/default appearance review and measured retrieval/latency/memory
  baselines remain pending.
- Application MIT license file, complete dependency/data notices, platform
  runtime bundles, signing/notarization, and distribution packages remain
  release deliverables. WEB provenance and publisher terms are recorded.

Static checks and actual app observations are recorded separately in the local
manual-verification directory. Browser behavior cannot qualify native display
or pointer control. No GitHub issues were created/closed: the supplied spec
requested local Markdown tracking and had no tracker tickets.
