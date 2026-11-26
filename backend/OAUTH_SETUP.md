# OAuth sign-in setup (Google / Apple / Microsoft)

The buttons on the login page are real OAuth 2.0 Authorization Code + PKCE flows.
They stay disabled-with-message until the matching credentials exist in `backend/.env`.

## 1. Common redirect URI

Register this exact URL with each provider:

```
http://localhost:5173/auth/callback
```

Change it for production via `APP_URL` / `OAUTH_REDIRECT_URI` in `backend/.env`.

## 2. Google

1. Create an OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Authorized redirect URI: `http://localhost:5173/auth/callback`.
3. Set in `backend/.env`:

```
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

`GOOGLE_CLIENT_SECRET` is optional for PKCE desktop/SPA clients.

## 3. Microsoft

1. Azure Portal → App registrations → New registration.
2. Authentication → Add platform → Web → `http://localhost:5173/auth/callback`.
3. Set:

```
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

`MICROSOFT_TENANT` defaults to `common`. Add `MICROSOFT_CLIENT_SECRET` only if your app registration requires it.

## 4. Apple

1. Create a **Services ID** with return URL `http://localhost:5173/auth/callback`.
2. Create a signing key (`.p8`) with Apple Sign In enabled. Note the Key ID and Team ID.
3. Set:

```
APPLE_CLIENT_ID=com.example.pixelcraft.signin
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

Or use `APPLE_PRIVATE_KEY_FILE=C:\path\to\AuthKey_XXXXXXXXXX.p8`.

## Security notes

- Client IDs are public; client secrets, Apple private keys, and AI API keys stay in `backend/.env`.
- The backend verifies the ID token signature, issuer, audience, expiry, and nonce.
- The browser keeps only the short-lived PKCE verifier/state in `sessionStorage`.
- A verified provider email can link to an existing local account with the same email.
