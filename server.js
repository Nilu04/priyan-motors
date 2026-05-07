// server.js - MongoDB Atlas Version
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const Grid = require('gridfs-stream');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-super-secret-jwt-key-change-this';

// MongoDB Atlas Connection String
// Get this from your MongoDB Atlas dashboard
const MONGODB_URI = 'mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/priyan-motors?retryWrites=true&w=majority';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
let gfs, gridfsBucket;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  
  // Initialize GridFS
  const conn = mongoose.connection;
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: 'uploads'
  });
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// ============= SCHEMAS =============
// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  profile_picture: { type: String },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Bike Schema
const bikeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  price_num: { type: Number, required: true },
  year: { type: String, required: true },
  km: { type: String, required: true },
  location: { type: String, required: true },
  brand: { type: String, required: true },
  image_id: { type: mongoose.Schema.Types.ObjectId }, // GridFS file ID
  image_url: { type: String }, // For external URLs
  created_at: { type: Date, default: Date.now }
});
const Bike = mongoose.model('Bike', bikeSchema);

// Sold Bike Schema
const soldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sold_price: { type: String, required: true },
  sold_price_num: { type: Number, required: true },
  month_year: { type: String, required: true },
  buyer: { type: String, required: true },
  image_id: { type: mongoose.Schema.Types.ObjectId },
  image_url: { type: String },
  created_at: { type: Date, default: Date.now }
});
const Sold = mongoose.model('Sold', soldSchema);

// Settings Schema
const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: String, required: true },
  updated_at: { type: Date, default: Date.now }
});
const Setting = mongoose.model('Setting', settingSchema);

// ============= GRIDFS STORAGE CONFIGURATION =============
const storage = new GridFsStorage({
  url: MONGODB_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        
        // Determine folder based on request type
        let folder = 'general';
        if (req.url.includes('profile')) folder = 'profiles';
        else if (req.url.includes('logo')) folder = 'logos';
        else if (req.url.includes('sold')) folder = 'sold';
        else if (req.url.includes('bike')) folder = 'bikes';
        
        const filename = `${folder}/${Date.now()}-${buf.toString('hex')}${path.extname(file.originalname)}`;
        
        resolve({
          filename: filename,
          bucketName: 'uploads'
        });
      });
    });
  }
});

const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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
  // Create default admin if not exists
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await User.create({ username: 'admin', password: hashedPassword });
    console.log('✅ Default admin user created');
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
      { name: "Hero Glamour", price: "Rs. 290,000", price_num: 290000, year: "2020", km: "26,200 km", location: "Batticaloa", brand: "Hero", image_url: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
      { name: "Apache RTR 180", price: "Rs. 350,000", price_num: 350000, year: "2014", km: "34,300 km", location: "Batticaloa", brand: "TVS", image_url: "https://i.ibb.co/yF2W5xJp/b2.jpg" },
      { name: "YAMAHA RAY ZR", price: "Rs. 490,000", price_num: 490000, year: "2018", km: "32,800 km", location: "Batticaloa", brand: "YAMAHA", image_url: "https://i.ibb.co/1tbJmkkr/b3.jpg" }
    ];
    await Bike.insertMany(sampleBikes);
    console.log('✅ Sample bikes added');
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
  
  const imageUrl = `/api/image/${req.file.id}`;
  await User.findByIdAndUpdate(req.user.id, { profile_picture: imageUrl });
  res.json({ imageUrl });
});

// ============= IMAGE RETRIEVAL ROUTE =============
app.get('/api/image/:id', async (req, res) => {
  try {
    const objectId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = gridfsBucket.openDownloadStream(objectId);
    
    downloadStream.on('data', (chunk) => {
      res.write(chunk);
    });
    
    downloadStream.on('error', () => {
      res.status(404).json({ error: 'Image not found' });
    });
    
    downloadStream.on('end', () => {
      res.end();
    });
  } catch (err) {
    res.status(404).json({ error: 'Image not found' });
  }
});

// ============= BIKE ROUTES =============
app.get('/api/bikes', async (req, res) => {
  try {
    const bikes = await Bike.find().sort({ created_at: -1 });
    // Convert image_id to URL if present
    const bikesWithUrls = bikes.map(bike => ({
      ...bike.toObject(),
      image: bike.image_id ? `/api/image/${bike.image_id}` : bike.image_url
    }));
    res.json(bikesWithUrls);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/bikes', authenticateToken, upload.single('image'), async (req, res) => {
  const { name, price, price_num, year, km, location, brand } = req.body;
  
  try {
    const bikeData = {
      name, price, price_num: parseInt(price_num), year, km, location, brand
    };
    
    if (req.file) {
      bikeData.image_id = req.file.id;
    } else if (req.body.image_url) {
      bikeData.image_url = req.body.image_url;
    }
    
    const bike = await Bike.create(bikeData);
    res.json({ id: bike.id, message: 'Bike added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bikes/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, price, price_num, year, km, location, brand } = req.body;
  
  try {
    const updateData = { name, price, price_num: parseInt(price_num), year, km, location, brand };
    
    if (req.file) {
      updateData.image_id = req.file.id;
      updateData.image_url = null;
    } else if (req.body.image_url) {
      updateData.image_url = req.body.image_url;
    }
    
    await Bike.findByIdAndUpdate(id, updateData);
    res.json({ message: 'Bike updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bikes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const bike = await Bike.findById(id);
    if (bike && bike.image_id) {
      await gridfsBucket.delete(bike.image_id);
    }
    await Bike.findByIdAndDelete(id);
    res.json({ message: 'Bike deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= SOLD BIKES ROUTES =============
app.get('/api/sold', async (req, res) => {
  try {
    const sold = await Sold.find().sort({ created_at: -1 });
    const soldWithUrls = sold.map(item => ({
      ...item.toObject(),
      image: item.image_id ? `/api/image/${item.image_id}` : item.image_url
    }));
    res.json(soldWithUrls);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/sold', authenticateToken, upload.single('image'), async (req, res) => {
  const { name, sold_price, sold_price_num, month_year, buyer } = req.body;
  
  try {
    const soldData = {
      name, sold_price, sold_price_num: parseInt(sold_price_num), month_year, buyer
    };
    
    if (req.file) {
      soldData.image_id = req.file.id;
    } else if (req.body.image_url) {
      soldData.image_url = req.body.image_url;
    }
    
    const sold = await Sold.create(soldData);
    res.json({ id: sold.id, message: 'Sold entry added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sold/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, sold_price, sold_price_num, month_year, buyer } = req.body;
  
  try {
    const updateData = { name, sold_price, sold_price_num: parseInt(sold_price_num), month_year, buyer };
    
    if (req.file) {
      updateData.image_id = req.file.id;
      updateData.image_url = null;
    } else if (req.body.image_url) {
      updateData.image_url = req.body.image_url;
    }
    
    await Sold.findByIdAndUpdate(id, updateData);
    res.json({ message: 'Sold entry updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sold/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const sold = await Sold.findById(id);
    if (sold && sold.image_id) {
      await gridfsBucket.delete(sold.image_id);
    }
    await Sold.findByIdAndDelete(id);
    res.json({ message: 'Sold entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= SETTINGS ROUTES =============
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  
  try {
    const setting = await Setting.findOne({ key });
    res.json({ key, value: setting ? setting.value : null });
  } catch (err) {
    res.json({ key, value: null });
  }
});

app.post('/api/settings/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  let logoUrl = req.body.logoUrl;
  
  if (req.file) {
    logoUrl = `/api/image/${req.file.id}`;
  }
  
  try {
    await Setting.findOneAndUpdate(
      { key: 'website_logo' },
      { key: 'website_logo', value: logoUrl, updated_at: new Date() },
      { upsert: true }
    );
    res.json({ logoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/logo', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'website_logo' });
    res.json({ logoUrl: setting ? setting.value : 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
  } catch (err) {
    res.json({ logoUrl: 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
  }
});

// Verify token endpoint
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: { id: req.user.id, username: req.user.username } });
});

app.get('/api/me', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
initializeData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 MongoDB Atlas connected`);
  });
});
