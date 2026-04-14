# Security Test Checklist

Run these checks after the mobile and backend changes are deployed.

## 1. Broken access control / IDOR

Use two accounts: `user_a` and `user_b`.

1. Sign in as `user_a`.
2. Capture the bearer token from a dev proxy or server logs.
3. Call each sensitive endpoint with `user_id=user_b`.
4. Expected result:
   - The server ignores `user_b`.
   - Data returned belongs only to `user_a`, or the request is rejected.

Endpoints to test:

- `GET /v1/profile/history`
- `GET /v1/profile/style_dna`
- `GET /v1/billing/status`
- `GET /v1/rankings/me`
- `GET /v1/rankings/groups`
- `POST /v1/profile/sync`
- `POST /v1/profile/delete-account`
- `POST /v1/billing/verify-purchase`
- `POST /v1/rankings/groups`
- `POST /v1/rankings/groups/join`
- `DELETE /v1/rankings/groups/{id}`

## 2. Missing auth

Repeat the same requests with:

- No `Authorization` header
- An invalid JWT
- An expired JWT

Expected result:

- Private endpoints return `401` or `403`.
- Public endpoints still do not leak private data.

## 3. Supabase RLS

From the Supabase SQL editor:

1. Authenticate as `user_a`.
2. Attempt direct `select` from `outfits`, `user_profile`, `style_dna`, and `drip_score_history`.
3. Confirm only `user_a` rows are visible.
4. Attempt inserts/updates for `user_b.user_id`.
5. Confirm they fail.

## 4. Billing replay protection

Test with one real or sandbox purchase token.

1. Verify it once for `user_a`.
2. Replay the exact same request for `user_a`.
3. Replay it for `user_b`.

Expected result:

- Same-user replay should be idempotent or explicitly rejected.
- Cross-user replay must be rejected.
- A reused provider transaction must not unlock premium for another account.

## 5. Password reset link handling

1. Trigger a reset email.
2. Open the reset link on a device with only your app installed.
3. Confirm it lands in the correct app screen and updates only the correct account.
4. Confirm no tokens are written to logs.

## 6. Mobile storage

On a test device:

1. Sign in.
2. Inspect app storage.
3. Confirm Supabase session material is not stored in plain AsyncStorage.

## 7. Transport security

1. Build with production env vars.
2. Confirm `EXPO_PUBLIC_API_BASE` uses `https://`.
3. Confirm the app fails closed if the API base is missing or unsafe.

## 8. Android release

1. Attempt a release build without release signing vars.
2. Confirm it fails.
3. Build again with release signing vars.
4. Confirm the artifact is not signed with the debug key.

