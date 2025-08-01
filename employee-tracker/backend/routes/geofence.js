const express = require('express');
const { body, query, validationResult } = require('express-validator');
const GeofenceRegion = require('../models/GeofenceRegion');
const { authenticateToken, requireAdminOrManager } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/geofence/regions
// @desc    Create a new geofence region
// @access  Private (Admin/Manager)
router.post('/regions',
  authenticateToken,
  requireAdminOrManager,
  [
    body('regionId')
      .trim()
      .isAlphanumeric()
      .isLength({ min: 3, max: 50 })
      .withMessage('Region ID must be alphanumeric and between 3-50 characters'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2-100 characters'),
    body('center.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('center.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('radius')
      .isInt({ min: 1, max: 10000 })
      .withMessage('Radius must be between 1 and 10000 meters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Address must not exceed 200 characters')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const {
        regionId,
        name,
        description,
        center,
        radius,
        allowedUsers,
        workingHours,
        workingDays,
        address
      } = req.body;

      // Check if region ID already exists
      const existingRegion = await GeofenceRegion.findOne({ regionId });
      if (existingRegion) {
        return res.status(400).json({
          success: false,
          message: 'Region ID already exists'
        });
      }

      // Create new geofence region
      const geofenceRegion = new GeofenceRegion({
        regionId,
        name,
        description: description || '',
        center: {
          latitude: center.latitude,
          longitude: center.longitude
        },
        radius,
        allowedUsers: allowedUsers || [],
        workingHours: workingHours || { start: '09:00', end: '18:00' },
        workingDays: workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        address: address || '',
        createdBy: req.user._id
      });

      await geofenceRegion.save();

      res.status(201).json({
        success: true,
        message: 'Geofence region created successfully',
        region: {
          id: geofenceRegion._id,
          regionId: geofenceRegion.regionId,
          name: geofenceRegion.name,
          description: geofenceRegion.description,
          center: geofenceRegion.center,
          radius: geofenceRegion.radius,
          workingHours: geofenceRegion.workingHours,
          workingDays: geofenceRegion.workingDays,
          address: geofenceRegion.address,
          isActive: geofenceRegion.isActive
        }
      });

    } catch (error) {
      console.error('Create geofence region error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating geofence region'
      });
    }
  }
);

// @route   GET /api/geofence/regions
// @desc    Get all geofence regions
// @access  Private
router.get('/regions', authenticateToken, async (req, res) => {
  try {
    const regions = await GeofenceRegion.find({ isActive: true })
      .populate('createdBy', 'name employeeId')
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      regions
    });

  } catch (error) {
    console.error('Get geofence regions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching geofence regions'
    });
  }
});

// @route   GET /api/geofence/regions/:regionId
// @desc    Get a specific geofence region
// @access  Private
router.get('/regions/:regionId', authenticateToken, async (req, res) => {
  try {
    const { regionId } = req.params;

    const region = await GeofenceRegion.findOne({ regionId, isActive: true })
      .populate('createdBy', 'name employeeId')
      .populate('allowedUsers', 'name employeeId phoneNumber')
      .select('-__v');

    if (!region) {
      return res.status(404).json({
        success: false,
        message: 'Geofence region not found'
      });
    }

    res.json({
      success: true,
      region
    });

  } catch (error) {
    console.error('Get geofence region error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching geofence region'
    });
  }
});

// @route   PUT /api/geofence/regions/:regionId
// @desc    Update a geofence region
// @access  Private (Admin/Manager)
router.put('/regions/:regionId',
  authenticateToken,
  requireAdminOrManager,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2-100 characters'),
    body('center.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('center.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('radius')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Radius must be between 1 and 10000 meters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Address must not exceed 200 characters')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { regionId } = req.params;
      const updateData = req.body;

      const region = await GeofenceRegion.findOne({ regionId, isActive: true });
      if (!region) {
        return res.status(404).json({
          success: false,
          message: 'Geofence region not found'
        });
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          region[key] = updateData[key];
        }
      });

      await region.save();

      res.json({
        success: true,
        message: 'Geofence region updated successfully',
        region: {
          id: region._id,
          regionId: region.regionId,
          name: region.name,
          description: region.description,
          center: region.center,
          radius: region.radius,
          workingHours: region.workingHours,
          workingDays: region.workingDays,
          address: region.address,
          isActive: region.isActive,
          updatedAt: region.updatedAt
        }
      });

    } catch (error) {
      console.error('Update geofence region error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating geofence region'
      });
    }
  }
);

// @route   DELETE /api/geofence/regions/:regionId
// @desc    Deactivate a geofence region
// @access  Private (Admin/Manager)
router.delete('/regions/:regionId',
  authenticateToken,
  requireAdminOrManager,
  async (req, res) => {
    try {
      const { regionId } = req.params;

      const region = await GeofenceRegion.findOne({ regionId, isActive: true });
      if (!region) {
        return res.status(404).json({
          success: false,
          message: 'Geofence region not found'
        });
      }

      // Soft delete by setting isActive to false
      region.isActive = false;
      await region.save();

      res.json({
        success: true,
        message: 'Geofence region deactivated successfully'
      });

    } catch (error) {
      console.error('Delete geofence region error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting geofence region'
      });
    }
  }
);

// @route   POST /api/geofence/check-location
// @desc    Check if a location is within any geofence regions
// @access  Private
router.post('/check-location',
  authenticateToken,
  [
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { latitude, longitude } = req.body;
      const user = req.user;

      // Find all active regions
      const regions = await GeofenceRegion.find({ isActive: true });

      // Check which regions contain this point
      const containingRegions = regions.filter(region => {
        // Check if user is allowed in this region
        if (!region.isUserAllowed(user._id)) {
          return false;
        }
        
        return region.isPointInside(latitude, longitude);
      });

      // Get distances to all regions
      const regionDistances = regions.map(region => ({
        regionId: region.regionId,
        name: region.name,
        distance: region.getDistanceFromCenter(latitude, longitude),
        isInside: region.isPointInside(latitude, longitude),
        isUserAllowed: region.isUserAllowed(user._id)
      }));

      res.json({
        success: true,
        location: { latitude, longitude },
        containingRegions: containingRegions.map(region => ({
          regionId: region.regionId,
          name: region.name,
          center: region.center,
          radius: region.radius
        })),
        allRegions: regionDistances,
        isInAnyRegion: containingRegions.length > 0
      });

    } catch (error) {
      console.error('Check location error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while checking location'
      });
    }
  }
);

// @route   PUT /api/geofence/regions/:regionId/users
// @desc    Update allowed users for a geofence region
// @access  Private (Admin/Manager)
router.put('/regions/:regionId/users',
  authenticateToken,
  requireAdminOrManager,
  [
    body('allowedUsers')
      .isArray()
      .withMessage('Allowed users must be an array'),
    body('allowedUsers.*')
      .isMongoId()
      .withMessage('Each user ID must be a valid MongoDB ObjectId')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { regionId } = req.params;
      const { allowedUsers } = req.body;

      const region = await GeofenceRegion.findOne({ regionId, isActive: true });
      if (!region) {
        return res.status(404).json({
          success: false,
          message: 'Geofence region not found'
        });
      }

      region.allowedUsers = allowedUsers;
      await region.save();

      // Populate the updated region with user details
      await region.populate('allowedUsers', 'name employeeId phoneNumber');

      res.json({
        success: true,
        message: 'Allowed users updated successfully',
        region: {
          regionId: region.regionId,
          name: region.name,
          allowedUsers: region.allowedUsers
        }
      });

    } catch (error) {
      console.error('Update allowed users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating allowed users'
      });
    }
  }
);

module.exports = router;