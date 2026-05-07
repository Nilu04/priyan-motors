// server.js - Optimized for persistent data loading
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

// MongoDB Atlas Connection String
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://priyan_admin:PriyanMotor2026@cluster1.qobexsl.mongodb.net/priyan-motors?retryWrites=true&w=majority';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for large Base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ============= MONGODB CONNECTION =============
console.log('🔄 Connecting to MongoDB Atlas...');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log('📁 Database: priyan-motors');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// ============= SCHEMAS =============
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  profile_picture: { type: String },
  created_at: { type: Date, default: Date.now }
});

const bikeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  price_num: { type: Number, required: true },
  year: { type: String, required: true },
  km: { type: String, required: true },
  location: { type: String, required: true },
  brand: { type: String, required: true },
  image: { type: String },
  created_at: { type: Date, default: Date.now }
});

const soldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sold_price: { type: String, required: true },
  sold_price_num: { type: Number, required: true },
  month_year: { type: String, required: true },
  buyer: { type: String, required: true },
  image: { type: String },
  created_at: { type: Date, default: Date.now }
});

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: String, required: true },
  updated_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Bike = mongoose.model('Bike', bikeSchema);
const Sold = mongoose.model('Sold', soldSchema);
const Setting = mongoose.model('Setting', settingSchema);

// Helper: Convert buffer to Base64
const bufferToBase64 = (buffer, mimeType) => {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
};

// ============= AUTH MIDDLEWARE =============
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// ============= INITIALIZE DEFAULT DATA =============
async function initializeData() {
  try {
    // Create default admin if not exists
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await User.create({ username: 'admin', password: hashedPassword });
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }
    
    // Create default logo setting if not exists
    const logoSetting = await Setting.findOne({ key: 'website_logo' });
    if (!logoSetting) {
      await Setting.create({ key: 'website_logo', value: 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
      console.log('✅ Default logo setting created');
    }
    
    // Add sample bikes if none exist
    const bikeCount = await Bike.countDocuments();
    if (bikeCount === 0) {
      const sampleBikes = [
        { name: "Hero Glamour", price: "Rs. 290,000", price_num: 290000, year: "2020", km: "26,200 km", location: "Batticaloa", brand: "Hero", image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
        { name: "Apache RTR 180", price: "Rs. 350,000", price_num: 350000, year: "2014", km: "34,300 km", location: "Batticaloa", brand: "TVS", image: "https://i.ibb.co/yF2W5xJp/b2.jpg" },
        { name: "YAMAHA RAY ZR", price: "Rs. 490,000", price_num: 490000, year: "2018", km: "32,800 km", location: "Batticaloa", brand: "YAMAHA", image: "https://i.ibb.co/1tbJmkkr/b3.jpg" }
      ];
      await Bike.insertMany(sampleBikes);
      console.log('✅ Sample bikes added');
    }
    
    // Add sample sold bikes if none exist
    const soldCount = await Sold.countDocuments();
    if (soldCount === 0) {
      const sampleSold = [
        { name: "Honda CB Shine", sold_price: "Rs. 375,000", sold_price_num: 375000, month_year: "Feb 2025", buyer: "Mr. Ramesh", image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
        { name: "Yamaha FZ V3", sold_price: "Rs. 485,000", sold_price_num: 485000, month_year: "Mar 2025", buyer: "Mrs. Santhiya", image: "https://i.ibb.co/yF2W5xJp/b2.jpg" }
      ];
      await Sold.insertMany(sampleSold);
      console.log('✅ Sample sold entries added');
    }
  } catch (err) {
    console.error('Error initializing data:', err);
  }
}

// ============= AUTH ROUTES =============
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        profile_picture: user.profile_picture
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/register', authenticateToken, async (req, res) => {
  const { username, password } = req.body;
  
  if (req.user.username !== 'admin') {
    return res.status(403).json({ error: 'Only admin can create new users' });
  }
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    res.json({ message: 'User created successfully', id: user.id });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    await User.findByIdAndUpdate(req.user.id, { password: hashedNewPassword });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.post('/api/change-username', authenticateToken, async (req, res) => {
  const { newUsername } = req.body;
  
  try {
    await User.findByIdAndUpdate(req.user.id, { username: newUsername });
    const newToken = jwt.sign({ id: req.user.id, username: newUsername }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Username changed successfully', token: newToken, username: newUsername });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists or invalid' });
  }
});

app.post('/api/upload-profile-picture', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const imageData = bufferToBase64(req.file.buffer, req.file.mimetype);
    await User.findByIdAndUpdate(req.user.id, { profile_picture: imageData });
    res.json({ imageUrl: imageData });
  } catch (err) {
    console.error('Profile picture upload error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// ============= USER INFO ROUTES =============
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      id: user.id,
      username: user.username,
      profile_picture: user.profile_picture || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: { id: req.user.id, username: req.user.username } });
});

// ============= BIKE ROUTES =============
app.get('/api/bikes', async (req, res) => {
  try {
    const bikes = await Bike.find().sort({ created_at: -1 });
    // Set cache control headers
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(bikes);
  } catch (err) {
    console.error('Error fetching bikes:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/bikes', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, price, price_num, year, km, location, brand } = req.body;
    
    const bikeData = {
      name,
      price,
      price_num: parseInt(price_num),
      year,
      km,
      location,
      brand
    };
    
    if (req.file) {
      bikeData.image = bufferToBase64(req.file.buffer, req.file.mimetype);
    } else if (req.body.image_url) {
      bikeData.image = req.body.image_url;
    }
    
    const bike = await Bike.create(bikeData);
    res.json({ id: bike.id, message: 'Bike added successfully', bike });
  } catch (err) {
    console.error('Error adding bike:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bikes/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, price_num, year, km, location, brand } = req.body;
    
    const updateData = {
      name,
      price,
      price_num: parseInt(price_num),
      year,
      km,
      location,
      brand
    };
    
    if (req.file) {
      updateData.image = bufferToBase64(req.file.buffer, req.file.mimetype);
    } else if (req.body.image_url) {
      updateData.image = req.body.image_url;
    }
    
    const updatedBike = await Bike.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ message: 'Bike updated successfully', bike: updatedBike });
  } catch (err) {
    console.error('Error updating bike:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bikes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Bike.findByIdAndDelete(id);
    res.json({ message: 'Bike deleted successfully' });
  } catch (err) {
    console.error('Error deleting bike:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bikes', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // ADD THIS DEBUG LOGGING
    console.log('📥 Received bike data:', req.body);
    console.log('📸 Image file:', req.file ? req.file.originalname : 'No file');
    
    const { name, price, price_num, year, km, location, brand } = req.body;
    
    // Validate required fields with better error messages
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!year) missingFields.push('year');
    if (!km) missingFields.push('km');
    if (!location) missingFields.push('location');
    if (!brand) missingFields.push('brand');
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        received: req.body 
      });
    }
    
    const bikeData = {
      name,
      price,
      price_num: parseInt(price_num),
      year,
      km,
      location,
      brand
    };
    
    if (req.file) {
      bikeData.image = bufferToBase64(req.file.buffer, req.file.mimetype);
    } else if (req.body.image_url) {
      bikeData.image = req.body.image_url;
    }
    
    const bike = await Bike.create(bikeData);
    console.log('✅ Bike created successfully:', bike._id);
    res.json({ id: bike.id, message: 'Bike added successfully', bike });
  } catch (err) {
    console.error('❌ Error adding bike:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============= SOLD BIKES ROUTES =============
app.get('/api/sold', async (req, res) => {
  try {
    const sold = await Sold.find().sort({ created_at: -1 });
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(sold);
  } catch (err) {
    console.error('Error fetching sold:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/sold', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, sold_price, sold_price_num, month_year, buyer } = req.body;
    
    const soldData = {
      name,
      sold_price,
      sold_price_num: parseInt(sold_price_num),
      month_year,
      buyer
    };
    
    if (req.file) {
      soldData.image = bufferToBase64(req.file.buffer, req.file.mimetype);
    } else if (req.body.image_url) {
      soldData.image = req.body.image_url;
    }
    
    const sold = await Sold.create(soldData);
    res.json({ id: sold.id, message: 'Sold entry added successfully', sold });
  } catch (err) {
    console.error('Error adding sold entry:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sold/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sold_price, sold_price_num, month_year, buyer } = req.body;
    
    const updateData = {
      name,
      sold_price,
      sold_price_num: parseInt(sold_price_num),
      month_year,
      buyer
    };
    
    if (req.file) {
      updateData.image = bufferToBase64(req.file.buffer, req.file.mimetype);
    } else if (req.body.image_url) {
      updateData.image = req.body.image_url;
    }
    
    const updatedSold = await Sold.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ message: 'Sold entry updated successfully', sold: updatedSold });
  } catch (err) {
    console.error('Error updating sold entry:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sold/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Sold.findByIdAndDelete(id);
    res.json({ message: 'Sold entry deleted successfully' });
  } catch (err) {
    console.error('Error deleting sold entry:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============= SETTINGS ROUTES =============
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  
  try {
    const setting = await Setting.findOne({ key });
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ key, value: setting ? setting.value : null });
  } catch (err) {
    res.json({ key, value: null });
  }
});

app.post('/api/settings/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  let logoUrl = req.body.logoUrl;
  
  if (req.file) {
    logoUrl = bufferToBase64(req.file.buffer, req.file.mimetype);
  }
  
  try {
    await Setting.findOneAndUpdate(
      { key: 'website_logo' },
      { key: 'website_logo', value: logoUrl, updated_at: new Date() },
      { upsert: true }
    );
    res.json({ logoUrl });
  } catch (err) {
    console.error('Error updating logo:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/logo', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'website_logo' });
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ logoUrl: setting ? setting.value : 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
  } catch (err) {
    res.json({ logoUrl: 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
  }
});

// ============= HEALTH CHECK =============
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============= START SERVER =============
initializeData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔐 Admin login: admin / admin123`);
  });
}).catch(err => {
  console.error('Failed to initialize data:', err);
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (with warnings)`);
  });
});
