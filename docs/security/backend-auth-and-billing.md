# Backend Auth And Billing Requirements

This file describes the server-side changes required to finish the security hardening that cannot be enforced from the mobile client alone.

## 1. Derive identity from the Supabase JWT

Every sensitive endpoint must:

1. Read the `Authorization: Bearer <jwt>` header.
2. Verify the Supabase JWT server-side.
3. Resolve the acting app user from the verified auth subject.
4. Ignore or validate any client-supplied `user_id` against the resolved actor.

`user_id` from the request body or query string must never be treated as authority.

### FastAPI pattern

```py
from fastapi import Depends, Header, HTTPException, status

class AuthContext(TypedDict):
    auth_user_id: str
    app_user_id: str

async def require_auth(authorization: str | None = Header(default=None)) -> AuthContext:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()

    # Verify the token with Supabase/JWKS here.
    claims = verify_supabase_jwt(token)
    auth_user_id = str(claims["sub"])

    # Resolve your internal app user row from auth subject.
    app_user = get_user_by_auth_id(auth_user_id)
    if not app_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")

    return {
        "auth_user_id": auth_user_id,
        "app_user_id": str(app_user.id),
    }
```

### Endpoint rule

If the request contains `user_id`, reject mismatches:

```py
if payload.user_id and payload.user_id != auth["app_user_id"]:
    raise HTTPException(status_code=403, detail="user_id does not match authenticated user")
```

### Endpoints that must be auth-bound

- `POST /v1/profile/sync`
- `GET /v1/profile/history`
- `GET /v1/profile/style_dna`
- `POST /v1/profile/delete-account`
- `GET /v1/billing/status`
- `POST /v1/billing/verify-purchase`
- `GET /v1/rankings/me`
- `GET /v1/rankings/groups`
- `POST /v1/rankings/groups`
- `POST /v1/rankings/groups/join`
- `DELETE /v1/rankings/groups/{group_id}`
- `GET /v1/rankings/groups/{group_id}/details`

Public leaderboard endpoints can stay public if intended, but they still must not leak private outfits or private group membership.

## 2. Billing replay and cross-user protection

Billing verification must reject:

- The same purchase token being used twice.
- The same provider transaction ID being used twice.
- A token previously bound to a different `app_user_id`.

### Required rules

1. Verify the receipt directly with Apple/Google or your billing provider.
2. Extract canonical identifiers from the provider response.
3. Upsert only if the provider token and transaction belong to the same authenticated user.
4. Store the normalized receipt in a table with uniqueness constraints.

### Suggested table

```sql
create table if not exists billing_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  product_id text not null,
  purchase_token text,
  transaction_id text,
  original_transaction_id text,
  provider_customer_id text,
  raw_receipt jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists billing_receipts_purchase_token_uq
  on billing_receipts (platform, purchase_token)
  where purchase_token is not null;

create unique index if not exists billing_receipts_transaction_id_uq
  on billing_receipts (platform, transaction_id)
  where transaction_id is not null;

create unique index if not exists billing_receipts_original_txn_uq
  on billing_receipts (platform, original_transaction_id)
  where original_transaction_id is not null;
```

### Verification rule

If an incoming verified token or transaction already exists for another `user_id`, reject it with `409 Conflict` and log it as suspicious.

### Pseudocode

```py
existing = find_receipt(
    platform=payload.platform,
    purchase_token=normalized.purchase_token,
    transaction_id=normalized.transaction_id,
    original_transaction_id=normalized.original_transaction_id,
)

if existing and existing.user_id != auth["app_user_id"]:
    raise HTTPException(status_code=409, detail="Receipt already linked to another user")

if existing:
    update_receipt(existing.id, auth["app_user_id"], normalized)
else:
    insert_receipt(auth["app_user_id"], normalized)
```

## 3. Logging

Do not log:

- Access tokens
- Refresh tokens
- Raw receipts
- Password reset URLs
- Full outfit image URLs if they are private signed URLs

Log:

- Auth subject
- Resolved app user ID
- Endpoint name
- Provider receipt IDs
- Rejection reason

