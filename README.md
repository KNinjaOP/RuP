# RUP Finance Tracker

A full-stack finance tracking application for solo and group expense management with real-time synchronization across devices.

## Features

### Authentication
- User registration and login with JWT tokens
- Secure password hashing with bcrypt
- Persistent sessions across devices

### Solo Expenses
- Add, edit, and delete personal expenses
- Track by title, amount, type, and date
- Predefined expense categories (Food, Transport, Entertainment, etc.)
- View total expenses
- Full CRUD operations

### Group Expenses
- Create groups with unique join codes
- Join groups using shareable codes
- Add/remove members (creator only)
- Regenerate join codes for security
- Split expenses among multiple members
- Track who paid and who owes
- Balance summary showing borrowed/lent amounts
- Record settlements between members
- Delete confirmation for member removal

### UI/UX
- Light and dark theme toggle
- Responsive design for all devices
- Clean, modern interface
- Real-time updates
- Persistent theme preference

### Database
- MongoDB for data persistence
- All data synced across devices
- Secure data storage

## Tech Stack

### Frontend
- React 18
- Vite (build tool)
- React Router for navigation
- Axios for API calls
- CSS3 with CSS variables for theming

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- CORS enabled

## Project Structure

```
rup-finance-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SoloExpenses.jsx
│   │   │   ├── Groups.jsx
│   │   │   └── GroupDetail.jsx
│   │   ├── App.jsx        # Main app component
│   │   ├── App.css        # Global styles
│   │   ├── api.js         # API service layer
│   │   └── main.jsx       # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── server/                # Express backend
    ├── models/            # Mongoose models
    │   ├── User.js
    │   ├── Expense.js
    │   ├── Group.js
    │   ├── GroupExpense.js
    │   └── Settlement.js
    ├── routes/            # API routes
    │   ├── auth.js
    │   ├── expenses.js
    │   ├── groups.js
    │   └── groupExpenses.js
    ├── middleware/
    │   └── auth.js        # JWT authentication
    ├── server.js          # Express server
    ├── .env               # Environment variables
    └── package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd rup-finance-tracker
```

### 2. Install dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### 3. Configure environment variables

Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rup-finance-tracker
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

For MongoDB Atlas, replace `MONGODB_URI` with your connection string.

### 4. Start MongoDB
If using local MongoDB:
```bash
mongod
```

### 5. Run the application

**Terminal 1 - Start the backend:**
```bash
cd server
npm start
# or for development with auto-reload:
npm run dev
```

**Terminal 2 - Start the frontend:**
```bash
cd client
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage Guide

### Getting Started
1. Register a new account or login
2. Toggle between light/dark theme using the theme button

### Solo Expenses
1. Navigate to "Solo Expenses" tab
2. Click "Add Expense"
3. Fill in title, amount, type, and date
4. View all your expenses with total
5. Edit or delete any expense

### Groups
1. Navigate to "Groups" tab
2. **Create a Group:**
   - Click "Create Group"
   - Enter group name
   - Share the join code with friends
3. **Join a Group:**
   - Click "Join Group"
   - Enter the join code
4. Click on a group to view details

### Group Management
1. **Add Expense:**
   - Click "Add Expense"
   - Select who paid
   - Select members to split among
   - Amount is split equally
2. **View Balances:**
   - See who owes whom
   - Positive balance = you are owed money
   - Negative balance = you owe money
3. **Record Settlement:**
   - Click "Record Settlement"
   - Select payer and payee
   - Enter amount settled
4. **Manage Members:**
   - Group creator can remove members
   - Confirm before removal
   - Regenerate join codes for security

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/theme` - Update theme preference

### Solo Expenses
- `GET /api/expenses` - Get all user expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Groups
- `GET /api/groups` - Get user's groups
- `GET /api/groups/:id` - Get single group
- `POST /api/groups` - Create group
- `POST /api/groups/join` - Join group with code
- `POST /api/groups/:id/regenerate-code` - Regenerate join code
- `DELETE /api/groups/:id/members/:memberId` - Remove member
- `DELETE /api/groups/:id` - Delete group

### Group Expenses
- `GET /api/group-expenses/:groupId` - Get group expenses
- `POST /api/group-expenses/:groupId` - Create group expense
- `PUT /api/group-expenses/:groupId/:id` - Update expense
- `DELETE /api/group-expenses/:groupId/:id` - Delete expense
- `GET /api/group-expenses/:groupId/balance` - Get balance summary
- `POST /api/group-expenses/:groupId/settle` - Record settlement
- `GET /api/group-expenses/:groupId/settlements` - Get settlements

## Security Features
- Password hashing with bcrypt
- JWT token authentication
- Protected API routes
- Input validation
- Unique join codes for groups
- Creator-only group management

## Future Enhancements
- Export expenses to CSV/PDF
- Receipt photo uploads
- Recurring expenses
- Budget tracking
- Expense categories customization
- Push notifications
- Multiple currencies
- Advanced analytics and charts

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
MIT License

## Support
For issues or questions, please open an issue on GitHub.
