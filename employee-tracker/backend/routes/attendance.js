const express = require('express');
const { body, query, validationResult } = require('express-validator');
const moment = require('moment');
const AttendanceLog = require('../models/AttendanceLog');
const GeofenceRegion = require('../models/GeofenceRegion');
const { authenticateToken, requireAdminOrManager } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/attendance/log
// @desc    Log attendance event (login/logout/geofence)
// @access  Private
router.post('/log',
  authenticateToken,
  [
    body('type')
      .isIn(['login', 'logout', 'geofence_enter', 'geofence_exit'])
      .withMessage('Type must be login, logout, geofence_enter, or geofence_exit'),
    body('location.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('location.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('location.accuracy')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Accuracy must be a positive number'),
    body('regionId')
      .optional()
      .trim()
      .withMessage('Region ID must be a string'),
    body('deviceInfo.platform')
      .optional()
      .trim()
      .withMessage('Platform must be a string'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must not exceed 500 characters')
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

      const { type, location, regionId, deviceInfo, notes, timestamp } = req.body;
      const user = req.user;

      // Create attendance log
      const attendanceLog = new AttendanceLog({
        userId: user._id,
        username: user.name,
        employeeId: user.employeeId,
        type,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 0,
          altitude: location.altitude || null,
          heading: location.heading || null,
          speed: location.speed || null
        },
        regionId: regionId || null,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        deviceInfo: deviceInfo || {},
        notes: notes || null
      });

      // If this is a geofence event, verify the region exists and user is allowed
      if ((type === 'geofence_enter' || type === 'geofence_exit') && regionId) {
        const region = await GeofenceRegion.findOne({ regionId, isActive: true });
        if (!region) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or inactive geofence region'
          });
        }

        // Check if user is allowed in this region
        if (!region.isUserAllowed(user._id)) {
          return res.status(403).json({
            success: false,
            message: 'User not allowed in this geofence region'
          });
        }

        // Verify the location is actually within the geofence
        const isInside = region.isPointInside(location.latitude, location.longitude);
        if (type === 'geofence_enter' && !isInside) {
          return res.status(400).json({
            success: false,
            message: 'Location is not within the geofence region'
          });
        }
      }

      await attendanceLog.save();

      res.status(201).json({
        success: true,
        message: 'Attendance logged successfully',
        log: {
          id: attendanceLog._id,
          type: attendanceLog.type,
          location: attendanceLog.location,
          regionId: attendanceLog.regionId,
          timestamp: attendanceLog.timestamp,
          notes: attendanceLog.notes
        }
      });

    } catch (error) {
      console.error('Log attendance error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while logging attendance'
      });
    }
  }
);

// @route   GET /api/attendance/logs
// @desc    Get attendance logs for current user
// @access  Private
router.get('/logs',
  authenticateToken,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('type')
      .optional()
      .isIn(['login', 'logout', 'geofence_enter', 'geofence_exit'])
      .withMessage('Type must be login, logout, geofence_enter, or geofence_exit'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
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

      const { startDate, endDate, type, limit = 50, page = 1 } = req.query;
      const user = req.user;

      // Build query
      const query = { userId: user._id };

      // Date range filter
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Type filter
      if (type) {
        query.type = type;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get logs with pagination
      const logs = await AttendanceLog.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v');

      // Get total count for pagination
      const totalCount = await AttendanceLog.countDocuments(query);
      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json({
        success: true,
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });

    } catch (error) {
      console.error('Get attendance logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching attendance logs'
      });
    }
  }
);

// @route   GET /api/attendance/logs/today
// @desc    Get today's attendance logs for current user
// @access  Private
router.get('/logs/today', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const logs = await AttendanceLog.getTodayLogs(user._id);

    res.json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('Get today logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching today\'s logs'
    });
  }
});

// @route   GET /api/attendance/logs/summary
// @desc    Get attendance summary for current user
// @access  Private
router.get('/logs/summary',
  authenticateToken,
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
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

      const { startDate, endDate } = req.query;
      const user = req.user;

      // Default to current month if no dates provided
      const start = startDate ? new Date(startDate) : moment().startOf('month').toDate();
      const end = endDate ? new Date(endDate) : moment().endOf('month').toDate();

      // Get logs for the period
      const logs = await AttendanceLog.getLogsByDateRange(user._id, start, end);

      // Calculate summary
      const summary = {
        totalLogs: logs.length,
        loginCount: logs.filter(log => log.type === 'login').length,
        logoutCount: logs.filter(log => log.type === 'logout').length,
        geofenceEnterCount: logs.filter(log => log.type === 'geofence_enter').length,
        geofenceExitCount: logs.filter(log => log.type === 'geofence_exit').length,
        period: {
          startDate: start,
          endDate: end
        }
      };

      // Group logs by date
      const logsByDate = {};
      logs.forEach(log => {
        const date = moment(log.timestamp).format('YYYY-MM-DD');
        if (!logsByDate[date]) {
          logsByDate[date] = [];
        }
        logsByDate[date].push(log);
      });

      res.json({
        success: true,
        summary,
        logsByDate
      });

    } catch (error) {
      console.error('Get attendance summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching attendance summary'
      });
    }
  }
);

// @route   GET /api/attendance/admin/logs
// @desc    Get attendance logs for all users (Admin/Manager only)
// @access  Private (Admin/Manager)
router.get('/admin/logs',
  authenticateToken,
  requireAdminOrManager,
  [
    query('employeeId')
      .optional()
      .trim()
      .withMessage('Employee ID must be a string'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('type')
      .optional()
      .isIn(['login', 'logout', 'geofence_enter', 'geofence_exit'])
      .withMessage('Type must be login, logout, geofence_enter, or geofence_exit'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
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

      const { employeeId, startDate, endDate, type, limit = 50, page = 1 } = req.query;

      // Build query
      const query = {};

      // Employee filter
      if (employeeId) {
        query.employeeId = employeeId;
      }

      // Date range filter
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Type filter
      if (type) {
        query.type = type;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get logs with pagination
      const logs = await AttendanceLog.find(query)
        .populate('userId', 'name phoneNumber department role')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .select('-__v');

      // Get total count for pagination
      const totalCount = await AttendanceLog.countDocuments(query);
      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json({
        success: true,
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });

    } catch (error) {
      console.error('Get admin attendance logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching attendance logs'
      });
    }
  }
);

module.exports = router;