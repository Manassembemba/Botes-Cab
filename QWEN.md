# BOTES CAB - Project Context

## Project Overview

**BOTES CAB** is a comprehensive transportation/ride-hailing management application built with modern web technologies. The application provides a full-featured dashboard for managing vehicles, drivers (chauffeurs), missions (rides/bookings), clients, maintenance, accounting, and financial reporting.

### Core Features
- **Dashboard**: Overview and analytics
- **Vehicles**: Fleet management
- **Drivers (Chauffeurs)**: Driver management with availability tracking
- **Missions**: Ride/mission booking and management
- **Clients**: Client management with categories
- **Maintenance**: Vehicle maintenance tracking
- **Remboursements**: Reimbursement management
- **Accounting**: Financial accounting system
- **Reports**: PDF/CSV export functionality
- **Documents**: Document management
- **Settings**: Application configuration

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend Framework** | React 18.3.1 |
| **Language** | TypeScript 5.8.3 |
| **Build Tool** | Vite 5.4.19 |
| **Routing** | React Router DOM 6.30.1 |
| **State Management** | TanStack React Query 5.83.0 |
| **Forms** | React Hook Form 7.61.1 + Zod validation |
| **UI Components** | shadcn-ui (Radix UI primitives) |
| **Styling** | Tailwind CSS 3.4.17 |
| **Icons** | Lucide React |
| **Database** | Supabase (PostgreSQL) |
| **Date Handling** | date-fns |
| **PDF Export** | jsPDF + jspdf-autotable |
| **Theme** | next-themes |

## Project Structure

```
BOTES CAB/
├── src/
│   ├── components/       # UI and feature components
│   │   ├── accounting/   # Accounting-related components
│   │   ├── auth/         # Authentication components
│   │   ├── chauffeurs/   # Driver management components
│   │   ├── clients/      # Client management components
│   │   ├── dashboard/    # Dashboard widgets
│   │   ├── documents/    # Document management
│   │   ├── drivers/      # Driver-related components
│   │   ├── layout/       # Layout components (AppLayout, etc.)
│   │   ├── maintenance/  # Maintenance tracking
│   │   ├── missions/     # Mission/ride management
│   │   ├── remboursements/ # Reimbursement components
│   │   ├── settings/     # Settings panels
│   │   ├── ui/           # shadcn-ui base components
│   │   ├── vehicles/     # Vehicle management
│   │   └── vehicules/    # French variant vehicle components
│   ├── contexts/         # React contexts (AuthContext)
│   ├── data/             # Static/mock data
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Supabase client integration
│   ├── lib/              # Utility libraries
│   ├── pages/            # Page components (routes)
│   ├── services/         # Business logic services
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── migrations/       # Database schema migrations
│   └── config.toml       # Supabase configuration
├── public/               # Static assets
└── [config files]        # Vite, TS, Tailwind, ESLint configs
```

## Building and Running

### Prerequisites
- Node.js (v18+) and npm installed
- Supabase project configured (see `supabase/config.toml`)

### Development

```bash
# Install dependencies
npm install

# Start development server (port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Environment Variables

Create a `.env` file based on the following pattern:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

The application uses Supabase (PostgreSQL) with Row Level Security (RLS) enabled. Key tables include:

- `tb_chauffeurs` - Driver information with availability tracking
- `tb_vehicules` - Vehicle fleet management
- `missions` - Ride/booking records
- `clients` - Client database with categories
- `maintenance` - Vehicle maintenance logs
- `accounting` tables - Financial transactions
- `reservations` - Booking system

Database migrations are stored in `supabase/migrations/` with timestamps indicating version history.

## Development Conventions

### Code Style
- **TypeScript**: Strict typing with some relaxed rules (`noImplicitAny: false`, `strictNullChecks: false`)
- **Path Aliases**: Use `@/` alias for `src/` directory imports
- **Component Structure**: Functional components with TypeScript interfaces

### Testing Practices
- Currently no test framework configured
- Consider adding Vitest or Jest for unit/integration tests

### Git Workflow
- Standard Git workflow with conventional commits
- Database migrations should be versioned and reviewed

### Key Patterns
- **Protected Routes**: Authentication enforced via `ProtectedRoute` component
- **Auth Context**: Centralized auth state via `AuthContext`
- **React Query**: Server state management for data fetching
- **Form Validation**: Zod schemas with React Hook Form

## API Integration

Supabase client is configured at `src/integrations/supabase/client.ts`. All database operations use the Supabase JS SDK with RLS policies enforcing security at the database level.

## Export Features

The application includes PDF and CSV export functionality via `src/services/exportService.ts`:
- Financial reports with formatted tables
- Transaction histories
- Color-coded income/expense reporting

## Notes

- The project appears to be built with/for **Lovable** (a low-code platform)
- French language is used throughout the UI (BOTES CAB suggests a French-speaking region taxi/transport service)
- Multiple currency support (USD and CDF - Congolese Franc)
