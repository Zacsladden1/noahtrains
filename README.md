# Noahhtrains Fitness Platform

A comprehensive fitness tracking and coaching platform built with Next.js and Supabase.

## Features

### 🔐 Authentication & User Management
- Email/password authentication with Supabase Auth
- Role-based access control (Admin/Client)
- User profile management with onboarding

### 💪 Workout Tracking
- Complete workout logging system
- Exercise database with instructions and videos
- Set-by-set tracking with weight, reps, RIR, and tempo
- Workout history and progress analytics
- Rest timer and superset support

### 🍎 Nutrition Tracking
- Barcode scanning for food logging (using @zxing/library)
- Macro and calorie tracking with daily targets
- Water intake monitoring
- Meal-based food organization
- Open Food Facts API integration

### 💬 Real-time Messaging
- 1:1 chat between coach and clients
- Photo and document sharing
- Read receipts and typing indicators
- Push notifications support

### 📚 Content Library
- Video library for form correction and cooking
- Document library for programs and guides
- Category and tag-based organization
- Search and filter functionality

### 👨‍💼 Admin Dashboard (for Noah)
- Client management and progress monitoring
- Content management for videos and documents
- Payment tracking with Stripe integration
- Broadcast messaging and announcements

## Tech Stack

- **Frontend**: Next.js 13+ (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI primitives
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Database**: PostgreSQL with Row Level Security
- **Icons**: Lucide React
- **Fonts**: Cinzel (headings), Arial (body)

## Design System

### Colors
- **Primary Gold**: `#cda738` (brand color)
- **Accent Golds**: `#F59E0B`, `#D97706`
- **Backgrounds**: `#0b0b0b`, `#111111`
- **Surfaces**: `#1a1a1a`
- **Borders**: `#2a2a2a`

### Typography
- **Headings**: Cinzel (Google Fonts)
- **Body**: Arial, Helvetica, system-ui

### Layout
- **Mobile**: Bottom navigation bar
- **Desktop**: Left sidebar navigation
- **Responsive**: Mobile-first approach

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd noahhtrains-fitness-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabase Setup

1. Create a new Supabase project
2. Run the database migrations:
   - Copy and run the SQL from `supabase/migrations/create_schema.sql`
   - Run the seed data from `supabase/migrations/seed_data.sql`

3. Set up Row Level Security policies (included in migrations)

4. Create storage buckets:
   - `videos` (private)
   - `documents` (private)
   - `message-media` (private)
   - `avatars` (public)

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── (app)/              # Protected app routes
│   │   ├── dashboard/      # Client dashboard
│   │   ├── workouts/       # Workout tracking
│   │   ├── nutrition/      # Nutrition logging
│   │   ├── messages/       # Messaging system
│   │   ├── library/        # Content library
│   │   └── admin/          # Admin interface
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing/auth page
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── auth/               # Authentication forms
│   ├── dashboard/          # Dashboard components
│   ├── layout/             # Layout components
│   └── nutrition/          # Nutrition components
├── hooks/                  # React hooks
├── lib/                    # Utilities
├── supabase/
│   └── migrations/         # Database migrations
└── types/                  # TypeScript definitions
```

## Key Features Implementation

### Authentication Flow
- Landing page with sign-in/sign-up forms
- Profile creation with role assignment
- Protected routes with role-based access

### Workout System
- Exercise database with muscle groups and equipment
- Program templates and assignments
- Real-time set logging with rest timer
- Progress tracking and analytics

### Nutrition System
- Barcode scanning using react-barcode-scanner (optimized for iPhone 16 and modern mobile devices)
- Food database integration with Open Food Facts
- Macro ring visualizations
- Daily intake tracking by meals

### Messaging System
- Real-time chat using Supabase Realtime
- File attachment support
- Coach-client communication
- Admin broadcast capabilities

### Admin Features
- Client dashboard with progress overview
- Content management system
- Payment tracking integration
- User role management

## Database Schema

The platform uses a comprehensive PostgreSQL schema with:
- User profiles with role-based access
- Workout and exercise management
- Nutrition logging with macro tracking
- Real-time messaging system
- Content library management
- Payment tracking

All tables include Row Level Security policies to ensure data privacy and proper access control.

## Deployment

### Recent Fixes for Production Issues
- ✅ **Fixed RLS policies** to be more resilient when JWT role claims aren't present
- ✅ **Improved authentication** error handling for database connectivity issues
- ✅ **Added fallback behavior** when database is not accessible in production
- ✅ **Fixed favicon configuration** for production builds
- ✅ **Upgraded barcode scanner** to react-barcode-scanner for better iPhone 16 compatibility

### Environment Variables (Required for Deployment)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### Database Setup for Production
1. Run the migrations in Supabase SQL Editor:
   - `supabase/migrations/20250925083255_ancient_smoke.sql`
   - `supabase/migrations/20250925083403_velvet_prism.sql`
   - `supabase/migrations/20250925123000_fix_rls_policies.sql`
   - `supabase/migrations/20250925124500_add_nutrition_targets.sql`

2. The updated RLS policies now handle cases where JWT role claims aren't present, preventing profile fetch timeouts.

### Supabase
- Database and authentication are handled by Supabase
- File storage uses Supabase Storage buckets
- Real-time features use Supabase Realtime

### Frontend Deployment
- Can be deployed to Vercel, Netlify, or any Next.js-compatible platform
- Ensure environment variables are properly configured
- Build command: `npm run build`
- The app now gracefully handles database connectivity issues in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is private and proprietary to Noahhtrains.