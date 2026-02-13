# Quick Setup Guide

## Prerequisites
- Node.js (v16+)
- MongoDB (local or MongoDB Atlas account)

## Setup Steps

### 1. Install Dependencies

Open two terminals:

**Terminal 1 (Backend):**
```bash
cd server
npm install
```

**Terminal 2 (Frontend):**
```bash
cd client
npm install
```

### 2. Configure Database

**Option A: Local MongoDB**
- Make sure MongoDB is running on your system
- The default connection string in `.env` is: `mongodb://localhost:27017/rup-finance-tracker`

**Option B: MongoDB Atlas (Cloud)**
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string
4. Replace `MONGODB_URI` in `server/.env` with your connection string
   Example: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rup-finance-tracker`

### 3. Update Environment Variables (Optional)

Edit `server/.env` if you need to change:
- Port number (default: 5000)
- JWT secret (recommended for production)
- MongoDB URI

### 4. Start the Application

**Terminal 1 (Backend):**
```bash
cd server
npm start
```

Server will run on http://localhost:5000

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

Frontend will run on http://localhost:3000

### 5. Create Your First Account

1. Open http://localhost:3000 in your browser
2. Click "Register" 
3. Create your account
4. Start tracking expenses!

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running (if local)
- Check your connection string in `.env`
- Verify network access in MongoDB Atlas (whitelist your IP)

### Port Already in Use
- Change the PORT in `server/.env`
- Change the port in `client/vite.config.js`

### CORS Errors
- Make sure both servers are running
- Check that the proxy is configured correctly in `vite.config.js`

## Default Features to Test

1. **Solo Expenses**: Add, edit, delete personal expenses
2. **Groups**: Create a group and get a join code
3. **Group Expenses**: Split bills with friends
4. **Themes**: Toggle between light and dark mode
5. **Balance**: See who owes whom in group expenses

## Production Deployment

For production:
1. Build the frontend: `cd client && npm run build`
2. Use environment variables for sensitive data
3. Enable HTTPS
4. Use a production-grade MongoDB setup
5. Implement rate limiting and additional security measures

Enjoy tracking your finances with RUP! 🚀
