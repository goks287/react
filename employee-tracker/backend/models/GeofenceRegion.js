const mongoose = require('mongoose');

const geofenceRegionSchema = new mongoose.Schema({
  regionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  center: {
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
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 1,
    max: 10000, // Maximum 10km radius
    default: 50 // Default 50 meters
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  workingHours: {
    start: {
      type: String,
      default: '09:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
    },
    end: {
      type: String,
      default: '18:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
    }
  },
  workingDays: {
    type: [String],
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  },
  address: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
geofenceRegionSchema.index({ regionId: 1 });
geofenceRegionSchema.index({ isActive: 1 });
geofenceRegionSchema.index({ 'center.latitude': 1, 'center.longitude': 1 });

// Update the updatedAt field before saving
geofenceRegionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if a point is within the geofence
geofenceRegionSchema.methods.isPointInside = function(latitude, longitude) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = this.center.latitude * Math.PI/180;
  const φ2 = latitude * Math.PI/180;
  const Δφ = (latitude - this.center.latitude) * Math.PI/180;
  const Δλ = (longitude - this.center.longitude) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // Distance in meters
  return distance <= this.radius;
};

// Method to get distance from center
geofenceRegionSchema.methods.getDistanceFromCenter = function(latitude, longitude) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = this.center.latitude * Math.PI/180;
  const φ2 = latitude * Math.PI/180;
  const Δφ = (latitude - this.center.latitude) * Math.PI/180;
  const Δλ = (longitude - this.center.longitude) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Method to check if user is allowed
geofenceRegionSchema.methods.isUserAllowed = function(userId) {
  return this.allowedUsers.length === 0 || this.allowedUsers.includes(userId);
};

// Static method to find regions containing a point
geofenceRegionSchema.statics.findRegionsContainingPoint = function(latitude, longitude) {
  return this.find({ isActive: true }).then(regions => {
    return regions.filter(region => region.isPointInside(latitude, longitude));
  });
};

module.exports = mongoose.model('GeofenceRegion', geofenceRegionSchema);