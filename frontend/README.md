# Market Sentiment Intelligence Dashboard

A production-ready Next.js frontend for real-time cryptocurrency and stock market sentiment analysis using AI-driven insights.

## Features

- **Authentication**: Secure JWT-based login/signup
- **Dashboard**: Overview of tracked assets, sentiment posts, and alerts
- **Asset Management**: Track/untrack cryptocurrencies and stocks
- **Posts Feed**: Real-time sentiment posts from Twitter and Reddit
- **Deep Analysis**: AI-powered LLM analysis on-demand
- **Alerts**: High-impact market movement notifications
- **Strategy Settings**: Customizable sentiment thresholds and keywords
- **Social Channels**: Follow and manage sentiment sources
- **Real-time Updates**: WebSocket integration for live data

## Tech Stack

- **Frontend Framework**: Next.js 16 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios
- **Real-time**: Socket.IO
- **Forms**: React Hook Form + Zod

## Setup

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables:
```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your API endpoints:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Running the Project

Development mode:
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
app/
├── auth/                  # Authentication pages
│   ├── login/
│   └── signup/
├── dashboard/             # Main application
│   ├── page.tsx          # Dashboard overview
│   ├── assets/           # Asset management
│   ├── posts/            # Posts feed and details
│   ├── alerts/           # Alerts page
│   └── settings/         # Strategy and channel settings
├── layout.tsx            # Root layout
└── globals.css           # Global styles

components/
├── layout/               # Navigation components
├── dashboard/            # Dashboard-specific components
├── posts/               # Posts-related components
├── ProtectedRoute.tsx   # Auth guard
└── SocketProvider.tsx   # WebSocket provider

hooks/
├── useAuth.ts           # Authentication hook
├── useSocket.ts         # WebSocket hook
└── useFetch.ts          # Data fetching hook

lib/
├── api.ts               # API endpoints
├── api-client.ts        # Axios configuration
├── store.ts             # Zustand store
└── types.ts             # TypeScript types
```

## Key Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/users/me` - Get current user

### Assets & Tracking
- `GET /api/assets` - List all assets
- `GET /api/assets/tracked/me` - User's tracked assets
- `POST /api/assets/add` - Track asset
- `DELETE /api/assets/remove` - Untrack asset

### Posts & Sentiment
- `GET /api/posts` - Fetch posts with filters
- `GET /api/posts/:id` - Get single post
- `POST /api/analysis/deep` - Deep LLM analysis

### Alerts & Settings
- `GET /api/alerts` - User's alerts
- `GET /api/strategies/strategy` - Get strategy config
- `POST /api/strategies/strategy/update` - Update strategy

### Channels
- `GET /api/channels` - List channels
- `POST /api/channels/follow` - Follow channel
- `DELETE /api/channels/unfollow` - Unfollow channel

## WebSocket Events

The app listens for real-time events:
- `new-post` - New sentiment post
- `new-sentiment` - Sentiment analysis complete
- `new-alert` - User-specific alert
- `new-alert-broadcast` - Broadcast alert

## Customization

### Theme
Edit `app/globals.css` to customize the dark theme colors. The design uses semantic tokens:
- Primary accent: `--accent` (purple/blue gradient)
- Bullish: Green (`#00ff00`)
- Bearish: Red (`#ff0000`)

### API Configuration
Update `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` in `.env.local` to point to your backend.

## Performance Optimizations

- Image optimization with Next.js Image component
- Code splitting and lazy loading
- API request caching with custom hooks
- Real-time updates via WebSocket instead of polling
- Responsive design (mobile-first)

## Security

- JWT token management with localStorage
- Automatic token refresh on 401 errors
- Protected routes with auth guard
- Input validation on all forms
- CORS-enabled API requests

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT

## Support

For issues or questions, please contact the development team or open an issue in the repository.
