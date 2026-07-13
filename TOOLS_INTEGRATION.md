# CSPWALA Tools integration

This folder is a self-contained static module intended to be mounted at `/tools` inside the existing CSPWALA website. It does not replace the current homepage, authentication, forum, news, resources or dashboard.

## Included now

- `/tools/` searchable tools landing page
- `/tools/image-compressor/` local batch compressor
- `/tools/image-resizer/` local dimension/DPI resizer
- `/tools/image-converter/` local JPG/PNG/WebP converter
- Shared tool registry, styles, privacy labels, favourites and recent-tool metadata

## Integration options

### Existing static/Firebase hosting

Copy the `tools` directory into the deployed public/static root. The URLs will work directly under `/tools/`.

### Existing Next.js App Router

Place the folder inside `public/tools`. Add a navigation link to `/tools/`. This allows the module to launch immediately without changing the existing application routes. It can later be migrated component-by-component into `src/app/tools`.

### Existing Vite/React app

Place the folder inside `public/tools`. Add a normal anchor link (`<a href="/tools/">Tools</a>`) rather than a client-side router link.

## Current privacy model

All three active tools use the browser Canvas API. Uploaded files are not sent to CSPWALA servers. Object URLs are revoked after reset, replacement, download preparation or page close.

## Next implementation batch

1. Signature crop and resize
2. Image to PDF
3. Merge PDF
4. Split PDF
5. PDF to image
6. Existing CSPWALA PDF signature verifier integration
