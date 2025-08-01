# Employee Tracker Mobile App

A React Native (Expo) mobile application for tracking employee attendance with GPS location and geofencing capabilities.

## Features

- 📱 **Phone Number + OTP Authentication**: Secure login using SMS verification
- 📍 **GPS Location Tracking**: Real-time location tracking for attendance
- 🏢 **Geofencing**: Automatic detection when entering/exiting office locations
- ⏰ **Manual Attendance**: Manual login/logout with location recording
- 📊 **Activity Logs**: View today's attendance events
- 🔄 **Background Tracking**: Continues tracking even when app is in background
- 📱 **Cross-Platform**: Works on both iOS and Android

## Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)
- Expo Go app on physical device (for testing)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API endpoint:**
   - Open `services/api.js`
   - Update `API_BASE_URL` to point to your backend server
   - For local development: `http://YOUR_LOCAL_IP:5000`
   - For production: `https://your-production-api.com`

3. **Start the development server:**
   ```bash
   npx expo start
   ```

## Development Setup

### Backend Connection

Make sure your backend server is running and accessible:

1. **Local Development:**
   - Backend should be running on `http://localhost:5000`
   - Update `API_BASE_URL` in `services/api.js` to use your local IP address
   - Example: `http://192.168.1.100:5000`

2. **Network Configuration:**
   - Ensure your mobile device and development machine are on the same network
   - Backend CORS should allow connections from mobile app

### Testing with Physical Device

1. **Install Expo Go:**
   - iOS: Download from App Store
   - Android: Download from Google Play Store

2. **Scan QR Code:**
   - Run `npx expo start`
   - Scan QR code with Expo Go app
   - App will load on your device

### Testing with Simulator/Emulator

1. **iOS Simulator:**
   ```bash
   npx expo start --ios
   ```

2. **Android Emulator:**
   ```bash
   npx expo start --android
   ```

## Configuration

### Permissions

The app requires the following permissions:

- **Location (Always)**: For GPS tracking and geofencing
- **Background App Refresh**: To continue tracking in background
- **Notifications**: For geofence event notifications

### Environment Variables

Update `services/api.js` with your configuration:

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:5000' // Replace with your local IP
  : 'https://your-production-api.com'; // Replace with production URL
```

## Usage

### Login Process

1. **Enter Phone Number:**
   - Enter your registered phone number with country code
   - Example: `+1234567890`

2. **Verify OTP:**
   - Check SMS for 6-digit verification code
   - Enter code to complete login

3. **Location Permission:**
   - Grant location permissions when prompted
   - Allow "Always" access for background tracking

### Attendance Tracking

1. **Manual Attendance:**
   - Use Login/Logout buttons on home screen
   - Location is automatically recorded

2. **Automatic Geofencing:**
   - App automatically detects when you enter/exit office locations
   - Geofence events are logged automatically

3. **View Activity:**
   - Today's attendance events are shown on home screen
   - Pull down to refresh data

## API Integration

The app communicates with the backend API for:

- **Authentication**: OTP sending and verification
- **Attendance Logging**: Recording login/logout events
- **Geofence Data**: Loading office locations and boundaries
- **Activity Logs**: Retrieving attendance history

### API Endpoints Used

- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/auth/profile` - Get user profile
- `POST /api/attendance/log` - Log attendance event
- `GET /api/attendance/logs/today` - Get today's logs
- `GET /api/geofence/regions` - Get geofence regions

## Testing

### Test Users

Use the following test phone numbers (if seeded in backend):

- `+1234567890` - John Doe (Admin)
- `+1234567891` - Jane Smith (Manager)
- `+1234567892` - Mike Johnson (Employee)

### Test Locations

Test geofencing with these coordinates (if seeded):

- **Main Office**: 37.7749, -122.4194 (50m radius)
- **Branch Office**: 37.7849, -122.4094 (75m radius)
- **Warehouse**: 37.7649, -122.4294 (100m radius)

## Troubleshooting

### Common Issues

1. **Location Permission Denied:**
   - Go to device settings
   - Find the app and enable location permissions
   - Choose "Allow all the time" for background tracking

2. **API Connection Failed:**
   - Check if backend server is running
   - Verify API_BASE_URL is correct
   - Ensure device and server are on same network (for local dev)

3. **OTP Not Received:**
   - Check if Twilio is configured in backend
   - In development mode, OTP is logged to backend console
   - Verify phone number format (+1234567890)

4. **Geofencing Not Working:**
   - Ensure location permissions are granted
   - Check if geofence regions are loaded
   - Verify you're within the geofence radius

### Debug Information

- Check Expo console for error messages
- Backend logs show API requests and responses
- Location service logs show GPS and geofence events

## Building for Production

### iOS

1. **Configure app.json:**
   - Update app name, version, and bundle identifier
   - Set production API URL

2. **Build:**
   ```bash
   eas build --platform ios
   ```

### Android

1. **Configure app.json:**
   - Update app name, version, and package name
   - Set production API URL

2. **Build:**
   ```bash
   eas build --platform android
   ```

## Architecture

### File Structure

```
mobile-app/
├── App.js                 # Main app component
├── app.json              # Expo configuration
├── contexts/
│   └── AuthContext.js    # Authentication state management
├── screens/
│   ├── LoginScreen.js    # Phone + OTP login
│   └── HomeScreen.js     # Main dashboard
└── services/
    ├── api.js           # API communication
    └── locationService.js # GPS and geofencing
```

### Key Components

- **AuthContext**: Manages user authentication state
- **LocationService**: Handles GPS tracking and geofencing
- **API Service**: Communicates with backend server
- **LoginScreen**: Phone number and OTP verification
- **HomeScreen**: Dashboard with attendance controls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on both iOS and Android
5. Submit a pull request

## License

This project is licensed under the MIT License.