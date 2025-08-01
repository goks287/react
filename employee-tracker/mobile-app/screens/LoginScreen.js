import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Snackbar,
  HelperText,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { utils } from '../services/api';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOTP] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOTPTimer] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [errors, setErrors] = useState({});

  const { sendOTP, verifyOTP, isAuthenticated, error, clearError } = useAuth();

  // OTP timer countdown
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOTPTimer(timer => timer - 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Clear errors when user types
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [phoneNumber, otp]);

  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!cleanPhone) {
      return 'Phone number is required';
    }
    
    if (cleanPhone.length < 10) {
      return 'Phone number must be at least 10 digits';
    }
    
    const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
    
    if (!utils.validatePhoneNumber(formattedPhone)) {
      return 'Please enter a valid phone number';
    }
    
    return null;
  };

  const formatPhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
  };

  const handleSendOTP = async () => {
    try {
      setErrors({});
      
      const phoneError = validatePhoneNumber(phoneNumber);
      if (phoneError) {
        setErrors({ phone: phoneError });
        return;
      }

      setIsLoading(true);
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const result = await sendOTP(formattedPhone);

      if (result.success) {
        setStep('otp');
        setOTPTimer(300); // 5 minutes
        showSnackbar('OTP sent successfully! Check your messages.');
      } else {
        setErrors({ phone: result.message });
      }
    } catch (err) {
      setErrors({ phone: 'Failed to send OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setErrors({});
      
      if (!otp || otp.length !== 6) {
        setErrors({ otp: 'Please enter a valid 6-digit OTP' });
        return;
      }

      setIsLoading(true);
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const result = await verifyOTP(formattedPhone, otp);

      if (result.success) {
        showSnackbar('Login successful!');
        // Navigation will be handled by the auth state change
      } else {
        setErrors({ otp: result.message });
      }
    } catch (err) {
      setErrors({ otp: 'Failed to verify OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (otpTimer > 0) return;
    
    setOTP('');
    setErrors({});
    await handleSendOTP();
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPhoneStep = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>Welcome to Employee Tracker</Title>
        <Paragraph style={styles.subtitle}>
          Enter your phone number to receive a verification code
        </Paragraph>

        <TextInput
          label="Phone Number"
          mode="outlined"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
          autoFocus
          style={styles.input}
          error={!!errors.phone}
          disabled={isLoading}
        />
        
        <HelperText type="error" visible={!!errors.phone}>
          {errors.phone}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleSendOTP}
          loading={isLoading}
          disabled={isLoading || !phoneNumber.trim()}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Send Verification Code
        </Button>

        <Paragraph style={styles.helpText}>
          You'll receive a 6-digit code via SMS
        </Paragraph>
      </Card.Content>
    </Card>
  );

  const renderOTPStep = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>Enter Verification Code</Title>
        <Paragraph style={styles.subtitle}>
          We sent a 6-digit code to {utils.formatPhoneNumber(formatPhoneNumber(phoneNumber))}
        </Paragraph>

        <TextInput
          label="Verification Code"
          mode="outlined"
          value={otp}
          onChangeText={setOTP}
          placeholder="123456"
          keyboardType="numeric"
          maxLength={6}
          autoFocus
          style={styles.input}
          error={!!errors.otp}
          disabled={isLoading}
        />
        
        <HelperText type="error" visible={!!errors.otp}>
          {errors.otp}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleVerifyOTP}
          loading={isLoading}
          disabled={isLoading || otp.length !== 6}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Verify Code
        </Button>

        <View style={styles.resendContainer}>
          {otpTimer > 0 ? (
            <Text style={styles.timerText}>
              Resend code in {formatTimer(otpTimer)}
            </Text>
          ) : (
            <Button
              mode="text"
              onPress={handleResendOTP}
              disabled={isLoading}
              style={styles.resendButton}
            >
              Resend Code
            </Button>
          )}
        </View>

        <Button
          mode="text"
          onPress={() => {
            setStep('phone');
            setOTP('');
            setOTPTimer(0);
            setErrors({});
          }}
          style={styles.backButton}
        >
          Change Phone Number
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>📍</Text>
          <Text style={styles.logoText}>Employee Tracker</Text>
        </View>

        {step === 'phone' ? renderPhoneStep() : renderOTPStep()}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: height * 0.8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    elevation: 4,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    fontSize: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  button: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  helpText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  timerText: {
    color: '#666',
    fontSize: 14,
  },
  resendButton: {
    marginTop: 0,
  },
  backButton: {
    marginTop: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  snackbar: {
    marginBottom: 20,
  },
});

export default LoginScreen;