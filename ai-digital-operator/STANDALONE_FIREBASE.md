# Shadow Agent Standalone Firebase

The Shadow Agent standalone build is configured for:

- Project ID: `quick-response-h7ttf`
- Auth domain: `quick-response-h7ttf.firebaseapp.com`
- Firestore namespace: `shadowAgents/{uid}/...`

The Firebase web configuration is in `extension/standalone-config.js`. No login password is stored in this repository or config file.

## Required Firebase Console setup

1. In **Authentication → Sign-in method**, enable **Email/Password**.
2. Create the Firebase Authentication user that the Shadow Agent PCs will use.
3. In **Firestore Database**, create the default Firestore database.
4. Deploy/merge the rule from `FIRESTORE_RULES_SNIPPET.rules`:

```text
match /shadowAgents/{userId}/{document=**} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
}
```

## Multi-PC behavior

Install the same Shadow Agent build on PC-1, PC-2, PC-3, etc. Give each PC a unique Device Name, then sign all of them into the same standalone Firebase Authentication account.

Shared cloud data:

- `shadowAgents/{uid}/devices/{deviceId}`
- `shadowAgents/{uid}/workflows/{workflowId}`
- `shadowAgents/{uid}/customers/{contextId}`
- `shadowAgents/{uid}/observations/{segmentId}`

Each Chrome installation gets its own Device ID. Repeated workflows from multiple devices are merged by workflow fingerprint and per-device occurrence count.

## Customer reasoning context

When enabled, actual form values needed for reasoning can be stored in the customer context and synced to the authenticated user's namespace. Raw activity logs use markers instead of duplicating the values.

Never-store fields include login passwords/passcodes, OTP, CVV/CVC, UPI/ATM/transaction PIN/MPIN, and biometric/fingerprint/iris values.

## Important

This build must not use the existing CSPWALA Tools or Community Firebase projects. The dashboard is locked to `quick-response-h7ttf` for cloud connection.
