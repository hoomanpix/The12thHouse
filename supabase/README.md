# Supabase setup for The12thHouse

1. In Supabase Dashboard, open **SQL Editor** and run [`schema.sql`](./schema.sql).
2. In **Authentication → Users**, create the artist account with Email and Password.
3. Copy the user's UUID and run the two example `insert` statements at the bottom of `schema.sql`, replacing `USER_UUID`.
4. Open the deployed site's `/login` route and sign in with that account.

The public website remains readable without a session. The `/admin` route redirects visitors to `/login`, and authenticated users without an `artist` or `admin` role are redirected to the home page. Database writes and Storage writes are enforced by RLS and Storage policies, not by the React route guard alone.
