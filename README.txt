squareAi — DEPLOY KIT
=====================

This folder is a complete, ready-to-ship site:
  index.html                    the site
  netlify/functions/ask.js      the AI proxy (keeps your Anthropic key server-side)
  netlify.toml                  Netlify config

------------------------------------------------------------
FAST PATH — get it live (about 2 minutes)
------------------------------------------------------------
For the AI box to work you need Functions, so use a Git connect
OR the Netlify CLI (drag-and-drop alone won't build the function):

Option A — Git (easiest to keep updated)
  1. Put this folder in a GitHub repo.
  2. app.netlify.com → Add new site → Import from Git → pick the repo.
  3. Leave build command blank. Publish directory: "." — Deploy.

Option B — Netlify CLI
  1. npm install -g netlify-cli
  2. From inside this folder:  netlify deploy --prod
  3. Follow the prompts to create the site.

Static-only shortcut (PayPal works, AI box won't):
  Drag this folder onto app.netlify.com/drop for an instant URL.
  Good enough to test layout + PayPal; add Git/CLI later for the AI box.

------------------------------------------------------------
TURN ON THE AI BOX
------------------------------------------------------------
  1. Get a key at console.anthropic.com.
  2. Netlify → Site settings → Environment variables → add:
        ANTHROPIC_API_KEY = sk-ant-...   (mark it secret)
  3. Redeploy. The search box now answers live.
  (Model is set in ask.js — claude-sonnet-5; swap to
   claude-haiku-4-5-20251001 for a cheaper option.)

------------------------------------------------------------
TURN ON PAYPAL (test first, with fake money)
------------------------------------------------------------
  1. developer.paypal.com → Apps & Credentials → Sandbox → Create App.
  2. Copy the Client ID.
  3. In index.html, set:  var PAYPAL_CLIENT_ID = 'that-id';
  4. Redeploy. Click the gold PayPal button and log in with your
     sandbox BUYER account (Testing Tools → Sandbox Accounts →
     View/Edit Account for email + password).
  5. When happy, create a LIVE app and paste the LIVE Client ID instead.

Note: these are one-time payment buttons. For auto-renewing monthly
billing, switch to PayPal Subscriptions (plan IDs) — ask and I'll wire it.
