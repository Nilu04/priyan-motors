// server.js - Backend API server (ADDED SOLD IMAGE SUPPORT)
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-super-secret-jwt-key-change-this';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadDirs = ['./uploads', './uploads/bikes', './uploads/logos', './uploads/profiles', './uploads/sold'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Database setup
const db = new sqlite3.Database('./database.db');

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        profile_picture TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Bikes table
    db.run(`CREATE TABLE IF NOT EXISTS bikes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        price_num INTEGER NOT NULL,
        year TEXT NOT NULL,
        km TEXT NOT NULL,
        location TEXT NOT NULL,
        brand TEXT NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Sold bikes table with image support
    db.run(`CREATE TABLE IF NOT EXISTS sold (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sold_price TEXT NOT NULL,
        sold_price_num INTEGER NOT NULL,
        month_year TEXT NOT NULL,
        buyer TEXT NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Insert default admin if not exists
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['admin', hashedPassword]);
    
    // Insert default logo setting
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, ['website_logo', 'https://placehold.co/400x400/1E3A8A/white?text=PM']);
    
    // Insert sample bikes if none exist
    db.get(`SELECT COUNT(*) as count FROM bikes`, (err, row) => {
        if (row && row.count === 0) {
            const sampleBikes = [
                { name: "Hero Glamour", price: "Rs. 290,000", price_num: 290000, year: "2020", km: "26,200 km", location: "Batticaloa", brand: "Hero", image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
                { name: "Apache RTR 180", price: "Rs. 350,000", price_num: 350000, year: "2014", km: "34,300 km", location: "Batticaloa", brand: "TVS", image: "https://i.ibb.co/yF2W5xJp/b2.jpg" },
                { name: "YAMAHA RAY ZR", price: "Rs. 490,000", price_num: 490000, year: "2018", km: "32,800 km", location: "Batticaloa", brand: "YAMAHA", image: "https://i.ibb.co/1tbJmkkr/b3.jpg" }
            ];
            sampleBikes.forEach(bike => {
                db.run(`INSERT INTO bikes (name, price, price_num, year, km, location, brand, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [bike.name, bike.price, bike.price_num, bike.year, bike.km, bike.location, bike.brand, bike.image]);
            });
            console.log("Sample bikes inserted");
        }
    });
    
    // Insert sample sold bikes if none exist
    db.get(`SELECT COUNT(*) as count FROM sold`, (err, row) => {
        if (row && row.count === 0) {
            const sampleSold = [
                { name: "Honda CB Shine", sold_price: "Rs. 375,000", sold_price_num: 375000, month_year: "Feb 2025", buyer: "Mr. Ramesh", image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
                { name: "Yamaha FZ V3", sold_price: "Rs. 485,000", sold_price_num: 485000, month_year: "Mar 2025", buyer: "Mrs. Santhiya", image: "https://i.ibb.co/yF2W5xJp/b2.jpg" }
            ];
            sampleSold.forEach(sold => {
                db.run(`INSERT INTO sold (name, sold_price, sold_price_num, month_year, buyer, image) VALUES (?, ?, ?, ?, ?, ?)`,
                    [sold.name, sold.sold_price, sold.sold_price_num, sold.month_year, sold.buyer, sold.image]);
            });
            console.log("Sample sold entries inserted");
        }
    });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = './uploads/bikes';
        if (req.url.includes('profile')) {
            uploadPath = './uploads/profiles';
        } else if (req.url.includes('logo')) {
            uploadPath = './uploads/logos';
        } else if (req.url.includes('sold')) {
            uploadPath = './uploads/sold';
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============= AUTH MIDDLEWARE =============
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// ============= AUTH ROUTES =============
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
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
    });
});

app.post('/api/register', authenticateToken, (req, res) => {
    const { username, password } = req.body;
    
    if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Only admin can create new users' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.json({ message: 'User created successfully', id: this.lastID });
    });
});

app.post('/api/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update password' });
            }
            res.json({ message: 'Password changed successfully' });
        });
    });
});

app.post('/api/change-username', authenticateToken, (req, res) => {
    const { newUsername } = req.body;
    const userId = req.user.id;
    
    db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], (err) => {
        if (err) {
            return res.status(400).json({ error: 'Username already exists or invalid' });
        }
        const newToken = jwt.sign({ id: userId, username: newUsername }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Username changed successfully', token: newToken, username: newUsername });
    });
});

app.post('/api/upload-profile-picture', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [imageUrl, req.user.id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update profile picture' });
        }
        res.json({ imageUrl });
    });
});

// ============= BIKE ROUTES =============
app.get('/api/bikes', (req, res) => {
    db.all('SELECT * FROM bikes ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/bikes', authenticateToken, upload.single('image'), (req, res) => {
    const { name, price, price_num, year, km, location, brand } = req.body;
    let image = req.body.image || null;
    
    if (req.file) {
        image = `/uploads/bikes/${req.file.filename}`;
    }
    
    db.run(`INSERT INTO bikes (name, price, price_num, year, km, location, brand, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, price, price_num, year, km, location, brand, image],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Bike added successfully' });
        }
    );
});

app.put('/api/bikes/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, price, price_num, year, km, location, brand } = req.body;
    let image = req.body.image;
    
    if (req.file) {
        image = `/uploads/bikes/${req.file.filename}`;
    }
    
    if (image) {
        db.run(`UPDATE bikes SET name=?, price=?, price_num=?, year=?, km=?, location=?, brand=?, image=? WHERE id=?`,
            [name, price, price_num, year, km, location, brand, image, id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Bike updated successfully' });
            }
        );
    } else {
        db.run(`UPDATE bikes SET name=?, price=?, price_num=?, year=?, km=?, location=?, brand=? WHERE id=?`,
            [name, price, price_num, year, km, location, brand, id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Bike updated successfully' });
            }
        );
    }
});

app.delete('/api/bikes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM bikes WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Bike deleted successfully' });
    });
});

// ============= SOLD BIKES ROUTES (with image support) =============
app.get('/api/sold', (req, res) => {
    db.all('SELECT * FROM sold ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/sold', authenticateToken, upload.single('image'), (req, res) => {
    const { name, sold_price, sold_price_num, month_year, buyer } = req.body;
    let image = req.body.image || null;
    
    if (req.file) {
        image = `/uploads/sold/${req.file.filename}`;
    }
    
    db.run(`INSERT INTO sold (name, sold_price, sold_price_num, month_year, buyer, image) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [name, sold_price, sold_price_num, month_year, buyer, image],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Sold entry added successfully' });
        }
    );
});

app.put('/api/sold/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, sold_price, sold_price_num, month_year, buyer } = req.body;
    let image = req.body.image;
    
    if (req.file) {
        image = `/uploads/sold/${req.file.filename}`;
    }
    
    if (image) {
        db.run(`UPDATE sold SET name=?, sold_price=?, sold_price_num=?, month_year=?, buyer=?, image=? WHERE id=?`,
            [name, sold_price, sold_price_num, month_year, buyer, image, id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Sold entry updated successfully' });
            }
        );
    } else {
        db.run(`UPDATE sold SET name=?, sold_price=?, sold_price_num=?, month_year=?, buyer=? WHERE id=?`,
            [name, sold_price, sold_price_num, month_year, buyer, id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Sold entry updated successfully' });
            }
        );
    }
});

app.delete('/api/sold/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM sold WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Sold entry deleted successfully' });
    });
});

// ============= SETTINGS ROUTES =============
app.get('/api/settings/:key', (req, res) => {
    const { key } = req.params;
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
        if (err || !row) {
            return res.json({ value: null });
        }
        res.json({ key, value: row.value });
    });
});

app.post('/api/settings/logo', authenticateToken, upload.single('logo'), (req, res) => {
    let logoUrl = req.body.logoUrl;
    
    if (req.file) {
        logoUrl = `/uploads/logos/${req.file.filename}`;
    }
    
    db.run(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        ['website_logo', logoUrl],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ logoUrl });
        }
    );
});

app.get('/api/settings/logo', (req, res) => {
    db.get('SELECT value FROM settings WHERE key = ?', ['website_logo'], (err, row) => {
        if (err || !row) {
            return res.json({ logoUrl: 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
        }
        res.json({ logoUrl: row.value });
    });
});

// Verify token endpoint
app.get('/api/verify-token', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// Get current user info
app.get('/api/me', authenticateToken, (req, res) => {
    db.get('SELECT id, username, profile_picture FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to see your app`);
});
