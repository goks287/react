const mongoose = require('mongoose');

const attendanceLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['login', 'logout', 'geofence_enter', 'geofence_exit'],
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    accuracy: {
      type: Number,
      default: 0
    },
    altitude: {
      type: Number,
      default: null
    },
    heading: {
      type: Number,
      default: null
    },
    speed: {
      type: Number,
      default: null
    }
  },
  address: {
    type: String,
    default: null
  },
  regionId: {
    type: String,
    default: null // For geofence events
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  deviceInfo: {
    platform: String,
    version: String,
    model: String
  },
  notes: {
    type: String,
    maxlength: 500
  },
  isManual: {
    type: Boolean,
    default: false // true if manually logged by admin/manager
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
attendanceLogSchema.index({ userId: 1, timestamp: -1 });
attendanceLogSchema.index({ employeeId: 1, timestamp: -1 });
attendanceLogSchema.index({ type: 1, timestamp: -1 });
attendanceLogSchema.index({ regionId: 1, timestamp: -1 });
attendanceLogSchema.index({ timestamp: -1 });

// Virtual for formatted timestamp
attendanceLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

// Method to get location as GeoJSON point
attendanceLogSchema.methods.getGeoJSONLocation = function() {
  return {
    type: 'Point',
    coordinates: [this.location.longitude, this.location.latitude]
  };
};

// Static method to get logs by date range
attendanceLogSchema.statics.getLogsByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId: userId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

// Static method to get today's logs
attendanceLogSchema.statics.getTodayLogs = function(userId) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  return this.getLogsByDateRange(userId, startOfDay, endOfDay);
};

module.exports = mongoose.model('AttendanceLog', attendanceLogSchema);