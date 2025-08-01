import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { attendanceAPI, geofenceAPI } from './api';
import { storage } from './api';

// Task names for background operations
const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCING_TASK_NAME = 'geofencing-task';

// Location service class
class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
    this.geofenceRegions = [];
    this.isTracking = false;
    this.lastKnownRegions = new Set();
  }

  // Initialize location service
  async initialize() {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Request background permissions
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus.status !== 'granted') {
        console.warn('Background location permission denied');
      }

      // Load geofence regions
      await this.loadGeofenceRegions();

      console.log('Location service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize location service:', error);
      throw error;
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000, // Use cached location if less than 10 seconds old
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // Start location tracking
  async startTracking() {
    try {
      if (this.isTracking) {
        console.log('Location tracking already started');
        return;
      }

      // Start foreground location tracking
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 10, // Update when moved 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      // Start background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 60000, // Update every minute in background
        distanceInterval: 20, // Update when moved 20 meters
        foregroundService: {
          notificationTitle: 'Employee Tracker',
          notificationBody: 'Tracking your location for attendance',
        },
      });

      this.isTracking = true;
      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  // Stop location tracking
  async stopTracking() {
    try {
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      this.isTracking = false;
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  // Load geofence regions from API
  async loadGeofenceRegions() {
    try {
      const response = await geofenceAPI.getRegions();
      this.geofenceRegions = response.regions || [];
      console.log(`Loaded ${this.geofenceRegions.length} geofence regions`);
    } catch (error) {
      console.error('Error loading geofence regions:', error);
      this.geofenceRegions = [];
    }
  }

  // Start geofencing
  async startGeofencing() {
    try {
      if (this.geofenceRegions.length === 0) {
        await this.loadGeofenceRegions();
      }

      // Register geofencing regions with Expo
      const regions = this.geofenceRegions.map(region => ({
        identifier: region.regionId,
        latitude: region.center.latitude,
        longitude: region.center.longitude,
        radius: region.radius,
        notifyOnEnter: true,
        notifyOnExit: true,
      }));

      await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);
      console.log('Geofencing started for', regions.length, 'regions');
    } catch (error) {
      console.error('Error starting geofencing:', error);
      throw error;
    }
  }

  // Stop geofencing
  async stopGeofencing() {
    try {
      await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
      console.log('Geofencing stopped');
    } catch (error) {
      console.error('Error stopping geofencing:', error);
    }
  }

  // Handle location updates
  async handleLocationUpdate(location) {
    try {
      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };

      // Check for geofence events manually (backup for background geofencing)
      await this.checkGeofenceEvents(this.currentLocation);

    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  // Check for geofence events
  async checkGeofenceEvents(location) {
    try {
      const currentRegions = new Set();

      // Check each geofence region
      for (const region of this.geofenceRegions) {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          region.center.latitude,
          region.center.longitude
        );

        const isInside = distance <= region.radius;
        const regionId = region.regionId;

        if (isInside) {
          currentRegions.add(regionId);

          // Check if this is a new entry
          if (!this.lastKnownRegions.has(regionId)) {
            await this.handleGeofenceEvent('enter', region, location);
          }
        }
      }

      // Check for exits
      for (const regionId of this.lastKnownRegions) {
        if (!currentRegions.has(regionId)) {
          const region = this.geofenceRegions.find(r => r.regionId === regionId);
          if (region) {
            await this.handleGeofenceEvent('exit', region, location);
          }
        }
      }

      this.lastKnownRegions = currentRegions;
    } catch (error) {
      console.error('Error checking geofence events:', error);
    }
  }

  // Handle geofence events
  async handleGeofenceEvent(eventType, region, location) {
    try {
      const attendanceType = eventType === 'enter' ? 'geofence_enter' : 'geofence_exit';
      
      console.log(`Geofence ${eventType}: ${region.name}`);

      // Log attendance event
      await this.logAttendance({
        type: attendanceType,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          heading: location.heading,
          speed: location.speed,
        },
        regionId: region.regionId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error(`Error handling geofence ${eventType}:`, error);
    }
  }

  // Log attendance event
  async logAttendance(data) {
    try {
      // Add device info
      const deviceInfo = {
        platform: 'mobile',
        version: '1.0.0',
      };

      const attendanceData = {
        ...data,
        deviceInfo,
      };

      await attendanceAPI.logAttendance(attendanceData);
      console.log('Attendance logged:', data.type);
    } catch (error) {
      console.error('Error logging attendance:', error);
      // Store failed requests for retry later
      await this.storeFailedRequest(data);
    }
  }

  // Store failed requests for retry
  async storeFailedRequest(data) {
    try {
      const failedRequests = await storage.getSettings();
      const requests = failedRequests.failedAttendanceRequests || [];
      requests.push({
        ...data,
        failedAt: new Date().toISOString(),
      });

      await storage.setSettings({
        ...failedRequests,
        failedAttendanceRequests: requests,
      });
    } catch (error) {
      console.error('Error storing failed request:', error);
    }
  }

  // Retry failed requests
  async retryFailedRequests() {
    try {
      const settings = await storage.getSettings();
      const failedRequests = settings.failedAttendanceRequests || [];

      if (failedRequests.length === 0) return;

      const successfulRequests = [];
      
      for (const request of failedRequests) {
        try {
          await attendanceAPI.logAttendance(request);
          successfulRequests.push(request);
          console.log('Retried attendance log:', request.type);
        } catch (error) {
          console.error('Failed to retry request:', error);
        }
      }

      // Remove successful requests
      const remainingRequests = failedRequests.filter(
        req => !successfulRequests.includes(req)
      );

      await storage.setSettings({
        ...settings,
        failedAttendanceRequests: remainingRequests,
      });

    } catch (error) {
      console.error('Error retrying failed requests:', error);
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Manual login/logout
  async manualLogin() {
    try {
      const location = await this.getCurrentLocation();
      await this.logAttendance({
        type: 'login',
        location,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error during manual login:', error);
      throw error;
    }
  }

  async manualLogout() {
    try {
      const location = await this.getCurrentLocation();
      await this.logAttendance({
        type: 'logout',
        location,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error during manual logout:', error);
      throw error;
    }
  }
}

// Background task handlers
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    console.log('Background location update:', locations);
    
    // Handle location update in background
    // Note: This runs in a separate JS context, so we need to be careful about state
  }
});

TaskManager.defineTask(GEOFENCING_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Geofencing task error:', error);
    return;
  }

  if (data) {
    const { eventType, region } = data;
    console.log('Geofencing event:', eventType, region);
    
    // Handle geofencing event in background
    // This would need to make API calls to log attendance
  }
});

// Export singleton instance
const locationService = new LocationService();
export default locationService;