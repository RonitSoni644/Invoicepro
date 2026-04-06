# Invoice and Billing System

This is a code bundle for Invoice and Billing System. The original project is available at https://www.figma.com/design/Z0oZd9X6HsXJs8ckbVrog1/Invoice-and-Billing-System.

## Running the code

Run `npm i` to install the dependencies.

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For the `supabase/functions/server` Edge Function, also set these Supabase secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Example:

```bash
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase functions deploy server
```

In your Supabase SQL editor, run [supabase/schema.sql](./supabase/schema.sql).

This creates the `kv_store_efa27997` table, removes the old admin-related tables if they exist, and applies the Row Level Security rules so each signed-in user can only access their own data.

Run `npm run dev` to start the development server.
