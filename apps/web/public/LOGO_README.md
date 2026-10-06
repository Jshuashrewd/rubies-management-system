Put the academy's logo file here, named exactly:

    logo.png

(delete this file once you've added it — it's just a placeholder note)

Why here, not the repo root:
Next.js only serves files placed in apps/web/public/ as static assets.
A file sitting at the monorepo root (next to STATUS.md) is NOT reachable
by the web app at all — it has to live in THIS folder specifically.

A square image works best (it's displayed at a fixed height in the navbar
and login screen, so extra width on a wide logo just gets letterboxed).
PNG with a transparent background is ideal. If your logo is a different
file type (SVG, JPG), rename the file to logo.png anyway, or tell Claude
and the <Logo> component can be adjusted to the real filename/extension.

Until this file is added, the app shows the "Rubies Code School" text
wordmark instead — nothing breaks, it just won't have the image yet.
