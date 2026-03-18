# Stripe production setup (nailif.vercel.app)

## Done in codebase

- **`.env.local`**  
  `NEXT_PUBLIC_SITE_URL` is set to `https://nailif.vercel.app` so Stripe success/cancel redirects use production when the request has no `Origin`/`Host`.

---

## You need to do

### 1. Vercel environment variables

1. Open your project on [vercel.com](https://vercel.com) → **Settings** → **Environment Variables**.
2. Add or edit:
   - **Name:** `NEXT_PUBLIC_SITE_URL`  
   - **Value:** `https://nailif.vercel.app`  
   - **Environments:** Production (and Preview if you test Stripe there).
3. After adding/editing, trigger a **redeploy** so the new value is used.

### 2. Stripe webhook for production

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL:** `https://nailif.vercel.app/api/stripe/webhook`
4. **Events to send:**  
   Click “Select events” and add:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Click **Add endpoint**.
6. Open the new endpoint and click **Reveal** under “Signing secret” (starts with `whsec_`).
7. In **Vercel** → **Settings** → **Environment Variables**, add:
   - **Name:** `STRIPE_WEBHOOK_SECRET`  
   - **Value:** the signing secret (e.g. `whsec_...`)  
   - **Environments:** Production (and Preview if you use it).
8. **Redeploy** the production app so the webhook secret is available.

Keep your existing local webhook (e.g. `http://localhost:3003/api/stripe/webhook`) and its secret in `.env.local` for local testing; the new endpoint is for production only.

---

## Summary

| Where        | What |
|-------------|------|
| **Vercel**  | `NEXT_PUBLIC_SITE_URL=https://nailif.vercel.app` and `STRIPE_WEBHOOK_SECRET=<production signing secret>`; then redeploy. |
| **Stripe**  | New webhook endpoint `https://nailif.vercel.app/api/stripe/webhook` with events `checkout.session.completed`, `checkout.session.expired`; copy its signing secret into Vercel. |
