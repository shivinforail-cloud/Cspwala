# CSPWALA Tools V2

Original CSPWALA-themed static module designed to mount at `/tools/` in the existing CSPWALA website.

## Coverage

The registry covers every core tool listed on pctool.in on 13 July 2026:

- 6 image tools
- 11 PDF tools
- 10 ID-card croppers
- 9 document generators
- 2 event-card tools
- PMFBY premium calculator
- Original poster brand editor

Each card opens the shared route `/tools/workspace/?tool=<slug>`. Common upload, privacy, preview and download code is reused rather than duplicated.

## Originality

No pctool.in source code, text, poster artwork, templates, logo, color palette or database was copied. The reference was used only to inventory functional categories.

## Safety and technical limitations

- Background removal uses local color-key processing and is not falsely described as AI.
- PDF signature inspection detects PDF signature structures; it does not claim certificate-chain, cryptographic or legal validity.
- PDF lock/unlock and OCR require additional production QA. The structured V2 package contains the extended raster/OCR implementation.
- ID-card presets are editable starting points because card and scan layouts vary.
- Generated declarations are drafts and must be checked against current authority/notary requirements.
- No government affiliation or official acceptance is claimed.

## Mounting

Copy the `tools` folder into the public/static root of the actual CSPWALA production codebase and add a navigation link to `/tools/`.

The connected GitHub repository does not currently contain the live CSPWALA application source, so this module remains isolated and does not modify the live homepage, forum, authentication or dashboard.
