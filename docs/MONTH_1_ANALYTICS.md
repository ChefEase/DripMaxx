# DripMaxx Month 1 Analytics Runbook

## Source of truth

| Question | Source |
| --- | --- |
| Views, reach, profile visits, social link clicks | TikTok Analytics, Instagram Insights, YouTube Studio, Reddit post insights |
| iOS product-page views, downloads, store conversion | App Store Connect > Analytics > Acquisition |
| Android listing visitors, first-time installers, store conversion | Google Play Console > User acquisition > Acquisition reports |
| Accounts, activation, feature completion, return use, sharing | Supabase SQL Editor using the growth views below |
| Subscription starts, renewals, churn, refunds, revenue | RevenueCat Charts; use store financial reports for final accounting |

Do not add social views and store visitors together. Each platform uses a
different definition. Preserve the raw values and compare conversion rates.

## Campaign naming

Give every content asset one stable lowercase ID:

`{channel}_{day}_{format}_{variant}`

Examples:

- `tt_d02_rating_demo_a`
- `ig_d11_weather_style_a`
- `yt_d15_date_outfit_b`
- `reddit_d03_ai_rating`
- `creator_maya01`

Links into DripMaxx may carry:

`?utm_source=tiktok&utm_medium=organic_video&utm_campaign=month1_rating&utm_content=tt_d02_rating_demo_a&creator=maya01`

The app preserves both the first touch and latest touch. Apple campaign links
and Google Play UTM links should use the same campaign/content IDs so exported
store data can be joined to the weekly scorecard by name.

## Apply the database migration

Run `DripMaxx-Backend/migrations/add_growth_analytics.sql` once in:

Supabase > SQL Editor > New query

The migration is idempotent. The backend startup also creates the required
event column and indexes, but the reporting views are installed by the SQL file.

## Weekly product dashboard

In Supabase SQL Editor:

```sql
select *
from growth_daily_funnel
where day >= current_date - 30
order by day;
```

```sql
select *
from growth_campaign_performance
order by activated_users desc, second_use_users desc;
```

```sql
select *
from growth_cohort_retention
where cohort_day >= current_date - 30
order by cohort_day;
```

## Funnel rates

```sql
select
  sum(new_accounts) as new_accounts,
  sum(rating_started_users) as rating_starts,
  sum(rating_completed_users) as rating_completions,
  sum(styling_started_users) as styling_starts,
  sum(styling_completed_users) as styling_completions,
  sum(paywall_viewed_users) as paywall_viewers,
  sum(purchased_users) as purchasers,
  round(100.0 * sum(rating_completed_users) / nullif(sum(rating_started_users), 0), 1) as rating_completion_pct,
  round(100.0 * sum(styling_completed_users) / nullif(sum(styling_started_users), 0), 1) as styling_completion_pct,
  round(100.0 * sum(purchased_users) / nullif(sum(paywall_viewed_users), 0), 1) as paywall_conversion_pct
from growth_daily_funnel
where day between :month_start and :month_end;
```

Replace `:month_start` and `:month_end` with quoted dates such as
`'2026-09-01'` and `'2026-09-30'` in the Supabase editor.

## Feature failures

```sql
select
  name,
  payload->>'reason' as reason,
  payload->>'platform' as platform,
  count(*) as failures,
  count(distinct coalesce(user_id, anonymous_id)) as affected_people
from event_log
where created_at >= now() - interval '30 days'
  and name in ('signup_failed', 'style_weather_failed', 'style_failed', 'purchase_failed')
group by 1, 2, 3
order by failures desc;
```

## Screen interest

```sql
select
  payload->>'screen' as screen,
  count(distinct coalesce(user_id, anonymous_id)) as viewers,
  count(*) as views
from event_log
where name = 'screen_viewed'
  and created_at >= now() - interval '30 days'
group by 1
order by viewers desc;
```

## Month-end questions

1. Did acquisition work? Compare store first-time downloads against the 1,000-user target and new accounts.
2. Which message won? Compare campaigns by activated users and second-use users, not views alone.
3. Which hero feature won? Compare rating and styling start, completion, and repeat-use behavior.
4. Where is the largest leak? Compare store conversion, signup/account conversion, feature starts, and feature completions.
5. Did users receive value? Review completion, sharing, and multi-day-use rates.
6. Did users return? Review mature D1 and D7 cohorts; exclude cohorts that have not yet had time to reach those days.
7. Did monetization work? Compare paywall viewers and purchase events, then verify transactions and revenue in RevenueCat.
8. What broke? Group failure events by reason and platform.
9. Which creator worked? Compare creator campaign downloads in store reports with identified activated and returning users in `growth_campaign_performance`.
10. What should Month 2 scale? Choose the source/format that repeatedly produces activated, returning users at an acceptable cost.

For paid campaigns, calculate:

`cost per activated user = campaign spend / activated users`

Use RevenueCat or store proceeds for revenue. Client `purchase_completed` is a
funnel event, not an accounting ledger.
