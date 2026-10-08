# URL Shortener

A simple and efficient URL shortener application built with Node.js, Express, and MongoDB.

## Deployment status

The previous split Vercel/Render deployment is retired. This repository now serves the frontend and API from one Node.js service, which keeps API URLs, redirects, and CORS configuration consistent.

## Features

- Shorten long URLs into manageable links
- User authentication and registration
- Personal dashboard to manage your URLs
- Click tracking and analytics
- QR code generation for shortened URLs
- Responsive web design

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: HTML, CSS, JavaScript
- **Authentication**: JWT tokens

## Quick Start

1. **Start the application and MongoDB**:

   ```bash
   docker compose up --build
   ```

2. **Open the application**:

   Go to `http://localhost:3000`.

For development without Docker, copy `.env.example` to `.env`, point `MONGODB_URI` at a running MongoDB instance, then run:

```bash
npm install
npm run dev
```

## Production Setup

For production deployment:

```env
NODE_ENV=production
BASE_URL=https://urlify-loky.onrender.com
FRONTEND_URL=https://your-urlify-domain.example
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/url-shortener
JWT_SECRET=your-production-secret-key
```

Deploy the included `render.yaml` as a Render Blueprint and provide `MONGODB_URI` from MongoDB Atlas when prompted. Render generates the JWT secret, and the app derives its public URL from Render automatically. One service hosts both the frontend and backend.

## Project Structure

```
URL-Shortner/
├── backend/
│   ├── server.js          # Main server file
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   └── config/            # Database config
├── frontend/
│   ├── *.html            # Web pages
│   ├── css/              # Stylesheets
│   └── js/               # JavaScript files
└── package.json
```

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/shorten` - Create short URL
- `GET /:shortCode` - Redirect to original URL
- `GET /api/urls` - Get user's URLs

## Usage

1. Register an account or login
2. Enter a long URL to shorten
3. Share your shortened URL
4. Track clicks and analytics in dashboard

## License

MIT License
