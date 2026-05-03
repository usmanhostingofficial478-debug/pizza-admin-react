# Pizza Admin Panel

Modern React/Next.js admin panel for pizza ordering system.

## Features

- **Dashboard**: Real-time stats, recent orders, active orders, activity feed
- **Orders**: Full order management with status updates, search, and filtering
- **Kitchen**: Kitchen view with order cards and status progression
- **Analytics**: Revenue charts and order status distribution
- **Menu Management**: View and manage menu items
- **Customers**: Customer database
- **Coupons**: Discount coupon management

## Tech Stack

- Next.js 14 (Static Export)
- React 18 + TypeScript
- Tailwind CSS
- Supabase (Real-time subscriptions)
- Recharts (Analytics)
- Lucide React (Icons)

## Deployment Instructions

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --dir=dist --prod
```

### Manual Deployment

1. Build the project: `npm run build`
2. The `dist` folder contains the static files
3. Upload the `dist` folder to any static hosting provider

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://brazcavcdsgrkkvxgjeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Project Structure

```
pizza-admin-react/
├── app/              # Next.js app router pages
├── components/       # Reusable components
├── lib/              # Utility functions and Supabase client
├── types/            # TypeScript type definitions
├── public/           # Static assets
└── dist/             # Build output
```

## Support

For issues or questions, please refer to the project documentation or contact support.
