# URL Shortener

A simple and efficient URL shortener application built with Node.js, Express, and MongoDB.

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

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file:

   ```env
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017/url-shortener
   JWT_SECRET=your-secret-key
   BASE_URL=http://localhost:8080
   ```

3. **Start the application**:

   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Go to `http://localhost:8080`

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
