This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## PYQ Deployment Workflow

This repo now supports keeping the app on Vercel while hosting the PYQ PDFs somewhere else.

### Recommended setup

- Keep the large `public/pyq` folder only on your local machine or your storage host.
- Generate a lightweight manifest with `npm run pyq:index`.
- Commit `public/pyq-index.json` to the repo.
- Set `PYQ_ASSET_BASE_URL` in Vercel to the public URL where the PDFs are hosted.

Example:

```bash
PYQ_ASSET_BASE_URL=https://files.example.com/pyq npm run pyq:index
```

### Environment variables

- `PYQ_ASSET_BASE_URL`
  - Optional.
  - Used to build final PDF links from the manifest entries.
- `PYQ_INDEX_URL`
  - Optional.
  - If set, the app fetches a remote `pyq-index.json` instead of the local `public/pyq-index.json`.

### Deployment steps

1. Upload the PYQ folder to S3, EC2, Vercel Blob, or another static file host.
2. Make sure the PDFs are publicly reachable from a URL like `https://files.example.com/pyq/...`.
3. Run `npm run pyq:index` locally.
4. Commit `public/pyq-index.json`.
5. Deploy to Vercel with `PYQ_ASSET_BASE_URL` set to your PDF host.
