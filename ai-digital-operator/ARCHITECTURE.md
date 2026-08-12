# CSPWALA AI Digital Operator Architecture

## Goal

Build a controlled AI operator that first learns real CSP/CSC/Aaple Sarkar work from demonstrations, then assists, and only later executes approved workflows with human gates.

## Layer 1 — Shadow Observer

**Runs on operator device.**

Captures:
- URL/page title and navigation.
- Click targets and labels.
- Form field identity/type, but not typed customer values in Phase 1.
- Upload count/type marker.
- Submit events.
- Visible success/error messages.
- Optional key screenshot events when explicitly enabled.

Produces normalized `ShadowEvent` records.

## Layer 2 — Task/Workflow Learner

Groups events into observation sessions and converts them into action signatures:

`event type + normalized host/path + selector + label`

A completed session produces a workflow candidate. Repeated identical candidates increase occurrence count and confidence.

Suggested lifecycle:

- `observed` — captured but untrusted.
- `candidate` — repeated pattern with enough evidence.
- `approved` — reviewed by operator.
- `deprecated` — portal/process changed.

No observed action becomes trusted merely because it occurred once.

## Layer 3 — Customer Intake + Document Intelligence

Separate from Shadow Observer data.

Suggested entities:
- `customers/{customerId}`
- `jobs/{jobId}`
- `jobs/{jobId}/documents/{documentId}`
- `jobs/{jobId}/extractions/{extractionId}`
- `jobs/{jobId}/approvals/{approvalId}`

Responsibilities:
- Service selection.
- Document upload/classification.
- Structured extraction.
- Cross-document mismatch detection.
- Missing-information questions.
- Provenance: every extracted field should point back to its document/source.

## Layer 4 — Portal Action Agent

Consumes an **approved** workflow and a validated job data object.

Execution states:
- `drafting`
- `executing`
- `waiting_for_human`
- `blocked`
- `completed`
- `failed`

Hard human gates should cover at least:
- OTP.
- CAPTCHA.
- Biometric.
- Payment/financial authorization.
- Declaration/consent.
- Final legally significant submit where review is appropriate.
- Any low-confidence mismatch or portal state not represented in the approved workflow.

## Layer 5 — Audit + Receipt Manager

Every agent run should log:
- Workflow/version used.
- Inputs referenced.
- Documents referenced.
- Fields filled/changed.
- Screens/steps visited.
- Human approvals requested and granted.
- Final receipt/reference number.
- Downloads/print/status actions.

## Suggested future Firestore shape

When production integration begins, reuse the Firebase project already configured for `tools.cspwala.in` and scope all data to the authenticated CSPWALA business/user.

Example conceptual hierarchy:

```text
businesses/{businessId}/aiOperator/settings
businesses/{businessId}/aiOperator/workflows/{workflowId}
businesses/{businessId}/aiOperator/workflows/{workflowId}/versions/{versionId}
businesses/{businessId}/aiOperator/jobs/{jobId}
businesses/{businessId}/aiOperator/jobs/{jobId}/events/{eventId}
businesses/{businessId}/aiOperator/jobs/{jobId}/approvals/{approvalId}
```

Do not sync raw browser observation logs to production until explicit Firestore rules, retention rules, business scoping, and privacy controls are in place.

## Phase 1 event example

```json
{
  "type": "input",
  "url": "https://portal.example/form",
  "title": "Application Form",
  "selector": "#applicantName",
  "label": "Applicant Name",
  "inputType": "text",
  "value": "[VALUE_ENTERED]",
  "sessionId": "session_...",
  "at": "2026-08-13T03:00:00.000Z"
}
```

## Future AI analysis contract

The AI analyzer should receive a reduced, privacy-aware representation of workflow events rather than uncontrolled screen recordings whenever possible. It should return structured output such as:

```json
{
  "taskName": "Income Certificate Application",
  "steps": [],
  "detectedErrors": [],
  "possibleRules": [],
  "uncertainties": [],
  "requiredHumanGates": []
}
```

Any inferred rule should carry evidence count and confidence, and should remain reviewable by the operator.
