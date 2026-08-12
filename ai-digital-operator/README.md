# CSPWALA AI Digital Operator — Phase 1 MVP

This module starts the **Shadow Learning Agent**: a privacy-first Chrome extension that observes browser work, records action structure, and turns real work into reusable workflow candidates.

## What works now

- Start/stop all-day observation from the extension popup.
- Capture page views, navigation, clicks, form inputs/changes, submits, and common success/error messages.
- **Automatic task segmentation:** when a success message is detected, or when work resumes after roughly 10 minutes of inactivity, the previous task is learned separately while the observer can remain ON all day.
- Store data locally in `chrome.storage.local`.
- Do **not** store typed customer values in Phase 1. Input values are replaced with markers such as `[VALUE_ENTERED]`, `[OPTION_SELECTED]`, or `[2 file(s)]`.
- Additional redaction guard for password/OTP/Aadhaar/PAN/account-like fields.
- Screenshot capture is OFF by default. If explicitly enabled, it is attempted only for submit/error events.
- Build workflow candidates from completed task segments.
- Match identical observed workflows and increase occurrence count/confidence.
- Require manual approval before a workflow is considered trusted.
- Dashboard for recent activity, learned workflows, approval/delete, settings, and JSON export.

## Install for local testing

1. Download/clone this branch.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `ai-digital-operator/extension` folder.
6. Pin **CSPWALA Shadow Agent**.
7. Click **Start Observing** and continue normal browser work. Successful tasks can be learned automatically; stopping observation also learns the current unfinished segment when enough actions exist.
8. Open **Learning Dashboard** to review captured actions and workflows.

## Important behavior

Phase 1 is an observer/learner, not an autonomous form submitter. It intentionally does not automate OTP, CAPTCHA, biometric, payment, declarations, or final legally significant submissions.

The learning rule is:

`Observed task → workflow candidate → repeated observations increase confidence → human approval → trusted workflow`

A wrong click therefore does not immediately become a permanent automation rule.

## Privacy model

The Shadow Agent is designed to learn **how work is performed**, not to collect customer records. Actual customer/document intelligence belongs to Phase 2 and should use a separately controlled intake pipeline with explicit purpose, access control, retention, and audit logs.

## Next phases

### Phase 2 — Customer Intake + Document Intelligence
- Customer/job creation.
- Document upload and classification.
- Extract structured fields from documents.
- Detect missing information and mismatches.
- Service-specific requirement checks.

### Phase 3 — Portal Action Agent
- Convert approved workflows into executable action plans.
- Fill fields and upload documents using controlled browser/computer-use execution.
- Pause on uncertainty, portal changes, OTP/CAPTCHA/biometric/payment, or final submission.

### Phase 4 — AI Digital Operator
- Customer request → document analysis → missing-question flow → portal execution → human approval → receipt/download/print/status tracking.
- Keep complete audit history of what the agent read, inferred, changed, and submitted.

## Production integration constraint

Do not create a separate production Firebase project for this module. When integrating it into `tools.cspwala.in`, reuse only the Firebase/auth/business context already configured for that production project and add explicit user/business scoping and security rules before syncing any observer data.
