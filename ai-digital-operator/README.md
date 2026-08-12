# CSPWALA AI Digital Operator — Shadow Agent v0.2

The Shadow Agent is a Chrome extension that observes real browser work, learns workflow structure, keeps customer reasoning context, and can synchronize learned knowledge across multiple PCs using the same Firebase-authenticated CSPWALA account.

## What works now

- All-day observation from the extension popup.
- Page views, navigation, clicks, field identity, submits, success/error signals.
- Automatic task segmentation on detected success or about 10 minutes of inactivity.
- Local raw activity history in `chrome.storage.local`.
- Customer reasoning contexts built from form fields for each task/segment.
- Customer values are kept separately from click/action logs.
- Deterministic workflow IDs so the same workflow can merge across PCs.
- Per-device workflow occurrence counts and shared confidence.
- Manual workflow approval before a workflow is trusted.
- Firebase Auth + Firestore REST cloud sync.
- Unique Device ID and editable PC/Device name.
- Offline sync queue; the extension retries cloud sync every minute.
- Cloud collections for devices, workflows, customer contexts, and compressed observations.
- Screenshots remain local and are not included in cloud sync.

## Customer data behavior

When **Save customer details for reasoning** is enabled, customer form values such as name, DOB, address, Aadhaar/PAN/account-related details, mobile/email, income/land/service fields can be stored in that task's customer context and synchronized to the authenticated account.

The action/event log itself stores only markers such as `[VALUE_CAPTURED]`; actual values live in the customer context.

The following authentication/authorization secrets are never intended to be retained as customer reasoning memory:

- Login passwords/passcodes.
- OTP / one-time password.
- CVV/CVC.
- UPI PIN / ATM PIN / transaction PIN / MPIN.
- Fingerprint, iris, or biometric values.

## Multi-PC model

Every Chrome installation receives a unique Device ID. Example:

```text
PC 1 → device_xxx → observe + customer context + workflows
PC 2 → device_yyy → observe + customer context + workflows
PC 3 → device_zzz → observe + customer context + workflows
                         ↓
                Same Firebase login
                         ↓
 aiOperatorUsers/{firebaseUid}/workflows
 aiOperatorUsers/{firebaseUid}/customers
 aiOperatorUsers/{firebaseUid}/observations
 aiOperatorUsers/{firebaseUid}/devices
```

Using the same Firebase-authenticated CSPWALA account on multiple PCs causes the workflow/customer knowledge to be pulled and merged locally during sync.

## Chrome installation

1. Download/clone this feature branch.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select `ai-digital-operator/extension`.
6. Pin **CSPWALA Shadow Agent**.
7. Open **Learning Dashboard**.

## Enable online sync

The repository does not currently contain the production CSPWALA Firebase web configuration. In the Learning Dashboard enter once per PC:

- Firebase Project ID.
- Firebase Web API Key.
- CSPWALA/Firebase login email.
- Password for the sign-in request (the extension does not persist the entered password).
- A friendly PC name such as `Shop PC 1`, `Counter PC 2`, etc.

Then click **Connect & Sync**.

The extension stores the Firebase refresh token locally so it can continue synchronizing without asking for the password every minute.

## Firestore security rule required

Merge `FIRESTORE_RULES_SNIPPET.rules` into the existing CSPWALA Firestore rules before production sync. The rule scopes all Shadow Agent documents to the authenticated Firebase UID, so a user cannot read another Firebase user's Shadow Agent data.

## Cloud sync strategy

Raw click/input events are not uploaded one-by-one. This keeps Firestore volume and cost controlled.

Cloud sync uploads:

- `devices` — device identity/heartbeat.
- `workflows` — learned workflow definitions and confidence.
- `customers` — customer reasoning context for each task segment.
- `observations` — compressed action sequence used as evidence for learning.

The extension queues changes locally while offline and retries once per minute.

## Important behavior

The Shadow Agent is still a learner, not an autonomous final submitter. It does not automatically complete OTP, CAPTCHA, biometric, payment, declaration/consent, or final legally significant submission steps.

Learning lifecycle:

`Observed task → workflow candidate → repeated multi-PC observations → confidence → human approval → trusted workflow`

## Next step — Document Intelligence

The next module should add customer/job creation and document upload/analysis so the reasoning context can combine:

`Form fields + Aadhaar/PAN/7-12/etc. documents + extracted fields + mismatches + learned workflow`

That becomes the input for the later Portal Action Agent.
