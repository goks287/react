import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ActivityIndicator,
  Snackbar,
  Surface,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { attendanceAPI, utils } from '../services/api';
import locationService from '../services/locationService';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const [todayLogs, setTodayLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const { user, logout } = useAuth();

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadTodayLogs(),
        initializeLocationService(),
      ]);
    } catch (error) {
      console.error('Error initializing screen:', error);
      showSnackbar('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeLocationService = async () => {
    try {
      await locationService.initialize();
      await locationService.startTracking();
      await locationService.startGeofencing();
      setLocationStatus('active');
      
      // Get current location
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
    } catch (error) {
      console.error('Error initializing location service:', error);
      setLocationStatus('error');
      showSnackbar('Location service unavailable');
    }
  };

  const loadTodayLogs = async () => {
    try {
      const response = await attendanceAPI.getTodayLogs();
      setTodayLogs(response.logs || []);
    } catch (error) {
      console.error('Error loading today logs:', error);
      showSnackbar('Failed to load attendance logs');
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadTodayLogs();
    setIsRefreshing(false);
  };

  const handleManualLogin = async () => {
    try {
      setIsLocationLoading(true);
      
      Alert.alert(
        'Confirm Login',
        'This will record your current location and time as a login event.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: async () => {
              try {
                await locationService.manualLogin();
                showSnackbar('Login recorded successfully!');
                await loadTodayLogs();
              } catch (error) {
                console.error('Manual login error:', error);
                showSnackbar('Failed to record login. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error during manual login:', error);
      showSnackbar('Failed to record login');
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleManualLogout = async () => {
    try {
      setIsLocationLoading(true);
      
      Alert.alert(
        'Confirm Logout',
        'This will record your current location and time as a logout event.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            onPress: async () => {
              try {
                await locationService.manualLogout();
                showSnackbar('Logout recorded successfully!');
                await loadTodayLogs();
              } catch (error) {
                console.error('Manual logout error:', error);
                showSnackbar('Failed to record logout. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error during manual logout:', error);
      showSnackbar('Failed to record logout');
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await locationService.stopTracking();
              await locationService.stopGeofencing();
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getLogTypeColor = (type) => {
    switch (type) {
      case 'login': return '#4CAF50';
      case 'logout': return '#FF5722';
      case 'geofence_enter': return '#2196F3';
      case 'geofence_exit': return '#FF9800';
      default: return '#757575';
    }
  };

  const getLogTypeLabel = (type) => {
    switch (type) {
      case 'login': return 'Manual Login';
      case 'logout': return 'Manual Logout';
      case 'geofence_enter': return 'Entered Office';
      case 'geofence_exit': return 'Left Office';
      default: return type;
    }
  };

  const getLocationStatusColor = () => {
    switch (locationStatus) {
      case 'active': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getLocationStatusText = () => {
    switch (locationStatus) {
      case 'active': return 'Location Tracking Active';
      case 'error': return 'Location Service Error';
      default: return 'Location Status Unknown';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Title style={styles.welcomeText}>Welcome back!</Title>
            <Paragraph style={styles.userName}>{user?.name}</Paragraph>
            <Paragraph style={styles.userInfo}>
              {user?.employeeId} • {user?.department}
            </Paragraph>
          </View>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            compact
          >
            Logout
          </Button>
        </View>
      </Surface>

      {/* Location Status */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Location Service</Text>
              <Chip
                icon="map-marker"
                style={[styles.statusChip, { backgroundColor: getLocationStatusColor() }]}
                textStyle={styles.statusChipText}
              >
                {getLocationStatusText()}
              </Chip>
            </View>
          </View>
          
          {currentLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                Current Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              <Text style={styles.accuracyText}>
                Accuracy: ±{Math.round(currentLocation.accuracy)}m
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Manual Attendance Buttons */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title style={styles.cardTitle}>Manual Attendance</Title>
          <Paragraph style={styles.cardSubtitle}>
            Use these buttons to manually log your attendance
          </Paragraph>
          
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={handleManualLogin}
              loading={isLocationLoading}
              disabled={isLocationLoading || locationStatus !== 'active'}
              style={[styles.actionButton, styles.loginButton]}
              contentStyle={styles.buttonContent}
              icon="login"
            >
              Login
            </Button>
            
            <Button
              mode="contained"
              onPress={handleManualLogout}
              loading={isLocationLoading}
              disabled={isLocationLoading || locationStatus !== 'active'}
              style={[styles.actionButton, styles.logoutButton]}
              contentStyle={styles.buttonContent}
              icon="logout"
            >
              Logout
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Today's Logs */}
      <Card style={styles.logsCard}>
        <Card.Content>
          <Title style={styles.cardTitle}>Today's Activity</Title>
          <Paragraph style={styles.cardSubtitle}>
            {formatDate(new Date())} • {todayLogs.length} events
          </Paragraph>
          
          <Divider style={styles.divider} />
          
          {todayLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No activity recorded today</Text>
              <Paragraph style={styles.emptySubtext}>
                Your attendance events will appear here
              </Paragraph>
            </View>
          ) : (
            todayLogs.map((log, index) => (
              <View key={log._id || index} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <Chip
                    style={[
                      styles.logTypeChip,
                      { backgroundColor: getLogTypeColor(log.type) }
                    ]}
                    textStyle={styles.logTypeText}
                  >
                    {getLogTypeLabel(log.type)}
                  </Chip>
                  <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                </View>
                
                <View style={styles.logDetails}>
                  <Text style={styles.logLocation}>
                    📍 {log.location.latitude.toFixed(6)}, {log.location.longitude.toFixed(6)}
                  </Text>
                  {log.regionId && (
                    <Text style={styles.logRegion}>
                      🏢 Region: {log.regionId}
                    </Text>
                  )}
                  <Text style={styles.logAccuracy}>
                    Accuracy: ±{Math.round(log.location.accuracy || 0)}m
                  </Text>
                </View>
                
                {index < todayLogs.length - 1 && <Divider style={styles.logDivider} />}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    elevation: 2,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    marginTop: 8,
  },
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusChipText: {
    color: 'white',
    fontWeight: '600',
  },
  locationInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: '#666',
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
  },
  logoutButton: {
    backgroundColor: '#FF5722',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  logsCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 2,
  },
  divider: {
    marginVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  logItem: {
    marginVertical: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTypeChip: {
    alignSelf: 'flex-start',
  },
  logTypeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  logTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  logDetails: {
    paddingLeft: 8,
  },
  logLocation: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    marginBottom: 2,
  },
  logRegion: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  logAccuracy: {
    fontSize: 11,
    color: '#999',
  },
  logDivider: {
    marginTop: 12,
  },
  snackbar: {
    marginBottom: 20,
  },
});

export default HomeScreen;