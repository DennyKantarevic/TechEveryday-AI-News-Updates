drop policy if exists "Service role manages newsletter subscriptions"
  on public.newsletter_subscriptions;
create policy "Service role manages newsletter subscriptions"
on public.newsletter_subscriptions for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role manages email delivery logs"
  on public.email_delivery_logs;
create policy "Service role manages email delivery logs"
on public.email_delivery_logs for all
to service_role
using (true)
with check (true);
