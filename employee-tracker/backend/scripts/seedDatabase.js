require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const GeofenceRegion = require('../models/GeofenceRegion');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    const users = [
      {
        phoneNumber: '+1234567890',
        name: 'John Doe',
        employeeId: 'EMP001',
        department: 'Engineering',
        role: 'admin'
      },
      {
        phoneNumber: '+1234567891',
        name: 'Jane Smith',
        employeeId: 'EMP002',
        department: 'Engineering',
        role: 'manager'
      },
      {
        phoneNumber: '+1234567892',
        name: 'Mike Johnson',
        employeeId: 'EMP003',
        department: 'Engineering',
        role: 'employee'
      },
      {
        phoneNumber: '+1234567893',
        name: 'Sarah Wilson',
        employeeId: 'EMP004',
        department: 'Marketing',
        role: 'employee'
      },
      {
        phoneNumber: '+1234567894',
        name: 'David Brown',
        employeeId: 'EMP005',
        department: 'Sales',
        role: 'employee'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users`);
    return createdUsers;

  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

const seedGeofenceRegions = async (users) => {
  try {
    // Clear existing regions
    await GeofenceRegion.deleteMany({});
    console.log('Cleared existing geofence regions');

    // Find admin user to be the creator
    const adminUser = users.find(user => user.role === 'admin');

    const regions = [
      {
        regionId: 'OFFICE_MAIN',
        name: 'Main Office',
        description: 'Primary office location in downtown',
        center: {
          latitude: 37.7749,  // San Francisco coordinates (example)
          longitude: -122.4194
        },
        radius: 50, // 50 meters
        address: '123 Business St, San Francisco, CA 94105',
        workingHours: {
          start: '09:00',
          end: '18:00'
        },
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        allowedUsers: [], // Empty means all users allowed
        createdBy: adminUser._id
      },
      {
        regionId: 'OFFICE_BRANCH',
        name: 'Branch Office',
        description: 'Secondary office location',
        center: {
          latitude: 37.7849,  // Slightly different location
          longitude: -122.4094
        },
        radius: 75, // 75 meters
        address: '456 Corporate Ave, San Francisco, CA 94102',
        workingHours: {
          start: '08:30',
          end: '17:30'
        },
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        allowedUsers: users.filter(user => user.department === 'Engineering').map(user => user._id),
        createdBy: adminUser._id
      },
      {
        regionId: 'WAREHOUSE',
        name: 'Warehouse Facility',
        description: 'Storage and logistics center',
        center: {
          latitude: 37.7649,
          longitude: -122.4294
        },
        radius: 100, // 100 meters
        address: '789 Industrial Blvd, San Francisco, CA 94107',
        workingHours: {
          start: '07:00',
          end: '16:00'
        },
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        allowedUsers: [], // All users allowed
        createdBy: adminUser._id
      }
    ];

    const createdRegions = await GeofenceRegion.insertMany(regions);
    console.log(`Created ${createdRegions.length} geofence regions`);
    return createdRegions;

  } catch (error) {
    console.error('Error seeding geofence regions:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    const users = await seedUsers();
    const regions = await seedGeofenceRegions(users);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users created: ${users.length}`);
    console.log(`📍 Geofence regions created: ${regions.length}`);
    
    console.log('\n🔐 Test Users:');
    users.forEach(user => {
      console.log(`📱 ${user.phoneNumber} - ${user.name} (${user.role})`);
    });
    
    console.log('\n📍 Geofence Regions:');
    regions.forEach(region => {
      console.log(`🏢 ${region.regionId} - ${region.name} (${region.radius}m radius)`);
    });
    
    console.log('\n💡 Instructions:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Use any of the phone numbers above to test OTP login');
    console.log('3. OTP codes will be logged to console (no real SMS in development)');
    console.log('4. Test geofencing with the coordinates provided above');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedUsers, seedGeofenceRegions };