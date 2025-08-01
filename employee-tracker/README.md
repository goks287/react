# Employee Tracker - Complete Solution

A comprehensive employee attendance tracking system with GPS location and geofencing capabilities, built with React Native (Expo) mobile app and Node.js + Express + MongoDB backend.

## 🚀 Features

### Mobile App
- 📱 **Phone Number + OTP Authentication**: Secure SMS-based login
- 📍 **Real-time GPS Tracking**: Continuous location monitoring
- 🏢 **Geofencing**: Automatic office entry/exit detection
- ⏰ **Manual Attendance**: Login/logout buttons with location recording
- 📊 **Activity Dashboard**: View today's attendance events
- 🔄 **Background Processing**: Works even when app is minimized
- 📱 **Cross-platform**: iOS and Android support

### Backend API
- 🔐 **JWT Authentication**: Secure token-based authentication
- 📨 **SMS OTP Integration**: Twilio-powered OTP delivery
- 🗄️ **MongoDB Database**: Scalable data storage
- 📊 **Attendance Logging**: Complete event tracking
- 🏢 **Geofence Management**: Define office boundaries
- 📈 **Analytics & Reports**: Attendance summaries and logs
- 🛡️ **Security Features**: Rate limiting, input validation, CORS

## 📁 Project Structure

```
employee-tracker/
├── backend/                 # Node.js + Express API
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Authentication & validation
│   ├── services/           # Business logic (OTP, etc.)
│   ├── config/             # Database configuration
│   ├── scripts/            # Database seeding
│   └── server.js           # Main server file
├── mobile-app/             # React Native (Expo) app
│   ├── screens/            # App screens
│   ├── services/           # API & location services
│   ├── contexts/           # State management
│   └── App.js              # Main app component
└── README.md               # This file
```

## 🛠️ Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Expo CLI (`npm install -g @expo/cli`)
- Twilio account (for SMS OTP)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and Twilio credentials

# Seed database with sample data
npm run seed

# Start development server
npm run dev
```

The backend will be running at `http://localhost:5000`

### 2. Mobile App Setup

```bash
# Navigate to mobile app directory
cd mobile-app

# Install dependencies
npm install

# Update API endpoint in services/api.js
# Change API_BASE_URL to your backend URL

# Start Expo development server
npx expo start
```

### 3. Test the Application

1. **Backend Health Check**: Visit `http://localhost:5000/health`
2. **Mobile App**: Scan QR code with Expo Go app
3. **Test Login**: Use phone numbers from seeded data (see backend logs)

## 📱 Mobile App Usage

### Authentication
1. Enter phone number with country code (+1234567890)
2. Receive SMS OTP (or check backend console in dev mode)
3. Enter 6-digit verification code
4. Grant location permissions when prompted

### Attendance Tracking
1. **Manual**: Use Login/Logout buttons on home screen
2. **Automatic**: App detects geofence entry/exit automatically
3. **View Logs**: Today's activity shown on dashboard

## 🔧 Backend API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Attendance
- `POST /api/attendance/log` - Log attendance event
- `GET /api/attendance/logs` - Get attendance logs (with filters)
- `GET /api/attendance/logs/today` - Get today's logs
- `GET /api/attendance/logs/summary` - Get attendance summary

### Geofencing
- `GET /api/geofence/regions` - Get all geofence regions
- `POST /api/geofence/regions` - Create new region (Admin)
- `PUT /api/geofence/regions/:id` - Update region (Admin)
- `POST /api/geofence/check-location` - Check if location is in any region

## 🗄️ Database Schema

### Users
- Phone number, name, employee ID, department, role
- Authentication and profile information

### Attendance Logs
- User ID, type (login/logout/geofence), location coordinates
- Timestamp, device info, region ID for geofence events

### Geofence Regions
- Region ID, name, center coordinates, radius
- Working hours, allowed users, creation info

### OTP Records
- Phone number, OTP code, expiration, usage status
- Rate limiting and attempt tracking

## 🔐 Security Features

### Backend
- JWT token authentication
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration
- Password-free authentication
- Secure OTP generation and validation

### Mobile App
- Secure token storage
- Automatic token refresh
- Location permission handling
- Background task security

## 🌍 Environment Configuration

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/employee-tracker
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=24h

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

NODE_ENV=development
```

### Mobile App (services/api.js)
```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:5000' // Development
  : 'https://your-production-api.com'; // Production
```

## 🧪 Testing

### Test Data (Seeded)

**Users:**
- `+1234567890` - John Doe (Admin)
- `+1234567891` - Jane Smith (Manager)
- `+1234567892` - Mike Johnson (Employee)
- `+1234567893` - Sarah Wilson (Employee)
- `+1234567894` - David Brown (Employee)

**Geofence Regions:**
- **Main Office**: 37.7749, -122.4194 (50m radius)
- **Branch Office**: 37.7849, -122.4094 (75m radius)
- **Warehouse**: 37.7649, -122.4294 (100m radius)

### Testing Workflow
1. Start backend server
2. Run database seeding
3. Start mobile app
4. Test login with seeded phone numbers
5. Test manual attendance logging
6. Test geofencing (if near test coordinates)

## 🚀 Deployment

### Backend Deployment
1. **Heroku/Railway/DigitalOcean**:
   - Set environment variables
   - Deploy Node.js application
   - Configure MongoDB connection

2. **Database**:
   - MongoDB Atlas (recommended)
   - Local MongoDB instance
   - Docker container

### Mobile App Deployment
1. **Development**: Expo Go app
2. **Production**: 
   - iOS: App Store (requires Apple Developer account)
   - Android: Google Play Store
   - Use `eas build` for production builds

## 🔧 Troubleshooting

### Common Issues

1. **Backend won't start**:
   - Check MongoDB connection
   - Verify environment variables
   - Check port availability

2. **Mobile app can't connect**:
   - Verify API_BASE_URL is correct
   - Check network connectivity
   - Ensure backend is running

3. **OTP not received**:
   - Check Twilio configuration
   - Verify phone number format
   - Check backend console for OTP (dev mode)

4. **Location not working**:
   - Grant location permissions
   - Enable "Always" location access
   - Check device location services

5. **Geofencing not triggering**:
   - Verify geofence regions are loaded
   - Check if within geofence radius
   - Ensure background location is enabled

## 📊 Features Roadmap

### Planned Enhancements
- [ ] Push notifications for geofence events
- [ ] Offline data synchronization
- [ ] Advanced reporting dashboard
- [ ] Face recognition for attendance
- [ ] Integration with HR systems
- [ ] Multi-tenant support
- [ ] Advanced analytics and insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Test on both iOS and Android
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the individual README files in backend and mobile-app directories

## 🙏 Acknowledgments

- Expo team for the excellent React Native framework
- MongoDB for the flexible database solution
- Twilio for reliable SMS services
- React Native Paper for beautiful UI components

---

**Built with ❤️ for efficient employee attendance tracking**