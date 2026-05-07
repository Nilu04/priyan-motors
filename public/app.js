// app.js - Frontend Application (FIXED PROFILE PICTURE)
const API_URL = '';
let token = localStorage.getItem('token');
let currentUser = null;
let currentPage = 'home';
let bikes = [];
let soldList = [];

// API Helper functions
async function apiCall(endpoint, options = {}) {
    const headers = { ...options.headers };
    
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            logout();
            showToast('Session expired. Please login again.');
            return null;
        }
        return response;
    } catch (error) {
        console.error('API Error:', error);
        showToast('Network error. Please try again.', true);
        return null;
    }
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); color: white; padding: 12px 24px; border-radius: 50px; z-index: 1000; animation: fadeInOut 3s ease;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Page Templates
const templates = {
    home: () => `
        <header class="hero-gradient min-h-[75vh] flex items-center justify-center text-center text-white">
            <div class="container mx-auto px-4 py-8">
                <span class="inline-block bg-blue-600/80 px-4 py-1 rounded-full text-sm font-bold mb-4">#RideTheExtraordinary</span>
                <h1 class="text-4xl md:text-7xl font-black mb-4">Own Your <span class="text-blue-400">Dream Machine</span></h1>
                <p class="text-base md:text-2xl text-gray-200 max-w-3xl mx-auto mb-6">Premium new & used motorcycles | Main Street, Kiran, Batticaloa</p>
                <div class="flex justify-center gap-4"><button onclick="navigateTo('bikes')" class="bg-blue-600 px-6 py-3 rounded-xl font-bold">Explore Bikes</button><button onclick="navigateTo('exchange')" class="bg-transparent border-2 border-white px-6 py-3 rounded-xl font-bold">Sell Your Bike</button></div>
                <div class="grid grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto"><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">500+</div><div class="text-xs">Bikes Sold</div></div><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">100%</div><div class="text-xs">Trust</div></div><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">24/7</div><div class="text-xs">Support</div></div></div>
            </div>
        </header>
        <section class="py-16 bg-white text-center"><h2 class="text-3xl font-bold mb-8">Why Choose <span class="text-blue-600">Mr. Priyan Motors?</span></h2><div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4"><div><i class="fas fa-shield-alt text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Trusted Dealer</h3><p class="text-gray-600">Since 2021</p></div><div><i class="fas fa-hand-holding-usd text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Best Exchange</h3><p class="text-gray-600">Instant valuation</p></div><div><i class="fas fa-file-signature text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Hassle-free Docs</h3><p class="text-gray-600">Full support</p></div></div></section>
    `,
    
    bikes: () => `
        <div class="container mx-auto px-4 py-8">
            <div class="flex justify-between items-center mb-6 flex-wrap gap-3"><div><h1 class="text-3xl md:text-4xl font-black">🔥 Available Motorcycles</h1><p class="text-gray-600">Browse our premium collection</p></div>${token ? `<button onclick="openAddBikeModal()" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-bold transition"><i class="fas fa-plus"></i> Add New Bike</button>` : ''}</div>
            <div class="flex gap-2 mb-6 flex-wrap"><button data-filter="all" class="filter-chip active-filter px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition">All Bikes</button><button data-filter="price-desc" class="filter-chip px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition">Price High-Low</button><button data-filter="price-asc" class="filter-chip px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition">Price Low-High</button></div>
            <div id="bikesGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
    `,
    
    sold: () => `
        <div class="container mx-auto px-4 py-8">
            <div class="flex justify-between items-center mb-6 flex-wrap gap-3"><div><h1 class="text-3xl md:text-4xl font-black">✅ Recently Sold Bikes</h1><p class="text-gray-500">Sold archive with buyer details and photos</p></div>${token ? `<button onclick="openAddSoldModal()" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-bold transition"><i class="fas fa-plus"></i> Add Sold Entry</button>` : ''}</div>
            <div id="soldGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
    `,
    
    exchange: () => `
        <div class="container mx-auto px-4 py-16 max-w-5xl text-center">
            <i class="fas fa-hand-holding-usd text-blue-600 text-5xl mb-4"></i>
            <h1 class="text-3xl md:text-5xl font-black">💰 Sell Your Bike Instantly</h1>
            <p class="text-xl text-gray-700 mt-3">Best Exchange Offers | Free Valuation | Instant Cash</p>
            <p class="text-lg text-gray-600 mt-2">Call or WhatsApp: <strong class="text-blue-600">075 350 3111</strong></p>
            <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition"><i class="fab fa-whatsapp text-green-600 text-5xl"></i><h2 class="text-2xl font-bold mt-4">WhatsApp Valuation</h2><p class="text-gray-600 mt-2">Send bike details & photos for instant quote</p><a href="https://wa.me/94753503111" class="inline-block mt-6 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold transition"><i class="fab fa-whatsapp mr-2"></i> Start Chat</a></div>
                <div class="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition"><i class="fas fa-phone-alt text-blue-600 text-5xl"></i><h2 class="text-2xl font-bold mt-4">Call for Exchange</h2><p class="text-gray-600 mt-2">Upgrade your bike with best buy-back offer</p><a href="tel:0753503111" class="inline-block mt-6 bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-full font-bold transition"><i class="fas fa-phone mr-2"></i> Call Now</a></div>
            </div>
            <div class="mt-16 bg-blue-50 rounded-2xl p-6 text-left"><h3 class="text-xl font-bold mb-3">📋 How It Works</h3><div class="grid md:grid-cols-3 gap-4 text-sm"><div class="flex gap-2"><span class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span> Share bike details & photos</div><div class="flex gap-2"><span class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span> Get instant valuation</div><div class="flex gap-2"><span class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span> Cash payment or exchange</div></div></div>
        </div>
    `,
    
    contact: () => `
        <div class="container mx-auto px-4 py-12">
            <div class="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                <div><h1 class="text-3xl md:text-5xl font-black mb-6">Visit Our <span class="text-blue-600">Showroom</span></h1>
                <div class="space-y-6 text-lg"><div class="flex items-start gap-4"><i class="fas fa-map-marker-alt text-blue-600 text-2xl mt-1"></i><div><p class="font-semibold">Address</p><p class="text-gray-600">Main Street, Kiran, Batticaloa, Sri Lanka</p></div></div>
                <div class="flex items-start gap-4"><i class="fas fa-phone-alt text-blue-600 text-2xl mt-1"></i><div><p class="font-semibold">Phone / WhatsApp</p><p class="text-gray-600">075 350 3111</p></div></div>
                <div class="flex items-start gap-4"><i class="fas fa-clock text-blue-600 text-2xl mt-1"></i><div><p class="font-semibold">Business Hours</p><p class="text-gray-600">Monday - Sunday: 9:00 AM - 8:00 PM</p></div></div>
                <div class="flex items-start gap-4"><i class="fas fa-envelope text-blue-600 text-2xl mt-1"></i><div><p class="font-semibold">Email</p><p class="text-gray-600">info@priyanmotors.lk</p></div></div></div>
                <div class="mt-8 flex gap-4 flex-wrap"><a href="https://wa.me/94753503111" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition"><i class="fab fa-whatsapp mr-2"></i> WhatsApp Us</a><a href="tel:0753503111" class="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition"><i class="fas fa-phone mr-2"></i> Call Now</a></div></div>
                <div class="bg-gray-200 rounded-2xl h-80 flex flex-col items-center justify-center"><i class="fas fa-map-marked-alt text-4xl text-gray-500 mb-3"></i><p class="text-gray-600 text-center px-4">📍 Main Street, Kiran<br>Batticaloa, Sri Lanka</p><p class="text-xs text-gray-500 mt-2">Google Map location available</p></div>
            </div>
        </div>
    `
};

// Navigation
function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active-page');
        } else {
            link.classList.remove('active-page');
        }
    });
    document.getElementById('pageContent').innerHTML = templates[page]();
    if (page === 'bikes') loadBikes();
    if (page === 'sold') loadSold();
    window.scrollTo(0, 0);
    document.getElementById('mobileTabs')?.classList.add('hidden');
}

async function loadBikes() {
    const response = await apiCall('/api/bikes');
    if (response && response.ok) {
        bikes = await response.json();
        renderBikes();
    }
}

async function loadSold() {
    const response = await apiCall('/api/sold');
    if (response && response.ok) {
        soldList = await response.json();
        renderSold();
    }
}

function renderBikes() {
    const grid = document.getElementById('bikesGrid');
    if (!grid) return;
    if (bikes.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-motorcycle text-4xl text-gray-300 mb-3 block"></i><p class="text-gray-500">No bikes available. Admin can add new bikes.</p></div>';
        return;
    }
    grid.innerHTML = bikes.map(bike => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-md bike-card border hover:shadow-lg transition">
            <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" class="bike-img w-full h-48 object-cover" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
            <div class="p-4"><h3 class="text-xl font-black">${escapeHtml(bike.name)}</h3><div class="text-blue-600 font-bold text-xl">${bike.price}</div>
            <div class="grid grid-cols-2 gap-1 text-xs text-gray-500 mt-2"><span><i class="far fa-calendar"></i> ${bike.year}</span><span><i class="fas fa-road"></i> ${bike.km}</span><span><i class="fas fa-map-marker-alt"></i> ${bike.location}</span><span><i class="fas fa-tag"></i> ${bike.brand}</span></div>
            ${token ? `<div class="flex gap-2 mt-4"><button onclick="editBike(${bike.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs transition"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteBike(${bike.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition"><i class="fas fa-trash"></i> Delete</button></div>` : `<a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}" class="mt-4 block bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-xl text-sm transition"><i class="fab fa-whatsapp mr-1"></i> Inquire Now</a>`}
            </div>
        </div>
    `).join('');
}

function renderSold() {
    const grid = document.getElementById('soldGrid');
    if (!grid) return;
    if (soldList.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-check-circle text-4xl text-gray-300 mb-3 block"></i><p class="text-gray-500">No sold records yet.</p></div>';
        return;
    }
    grid.innerHTML = soldList.map(s => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-md sold-card border hover:shadow-lg transition">
            <img src="${s.image || 'https://placehold.co/600x400/22C55E/white?text=Sold'}" class="sold-img w-full h-48 object-cover" onerror="this.src='https://placehold.co/600x400/22C55E/white?text=Sold'">
            <div class="p-4"><h3 class="text-xl font-bold">${escapeHtml(s.name)}</h3><p class="font-bold text-green-700 text-lg">${s.sold_price}</p>
            <p class="text-sm text-gray-600 mt-1"><i class="far fa-calendar-alt"></i> ${s.month_year} · Buyer: ${escapeHtml(s.buyer)}</p>
            ${token ? `<div class="flex gap-3 mt-4"><button onclick="editSold(${s.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs transition"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteSold(${s.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs transition"><i class="fas fa-trash"></i> Delete</button></div>` : `<div class="mt-3 text-gray-500 text-xs"><i class="fas fa-check-circle text-green-500"></i> Sold by Mr. Priyan Motors</div>`}
            </div>
        </div>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Authentication - FIXED to load profile picture on refresh
async function checkAuth() {
    if (!token) return false;
    
    try {
        const response = await apiCall('/api/verify-token');
        if (response && response.ok) {
            const data = await response.json();
            
            // Get full user info including profile picture
            const userResponse = await apiCall('/api/me');
            if (userResponse && userResponse.ok) {
                currentUser = await userResponse.json();
                console.log('User loaded:', currentUser);
            } else {
                currentUser = data.user;
            }
            
            updateUILoggedIn();
            return true;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
    
    return false;
}

function updateUILoggedIn() {
    document.getElementById('userStatusText').innerHTML = 'Admin';
    document.getElementById('dropdownUserName').innerHTML = `${currentUser?.username || 'Admin'} (Admin)`;
    document.getElementById('dropdownUserRole').innerHTML = '● Edit Mode';
    document.getElementById('logoutBtn').classList.remove('hidden');
    document.getElementById('showLoginOption').classList.add('hidden');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    
    // IMPORTANT: Update profile picture display
    if (currentUser?.profile_picture) {
        const profilePicUrl = currentUser.profile_picture;
        document.getElementById('navProfilePic').src = profilePicUrl;
        document.getElementById('navProfilePic').classList.remove('hidden');
        document.getElementById('dropdownProfilePic').src = profilePicUrl;
        
        // Hide the default user icon when profile pic exists
        const userIcon = document.querySelector('#accountBtn .fa-user-circle');
        if (userIcon) userIcon.style.display = 'none';
    } else {
        document.getElementById('navProfilePic').classList.add('hidden');
        const userIcon = document.querySelector('#accountBtn .fa-user-circle');
        if (userIcon) userIcon.style.display = 'inline-block';
    }
}

function updateUIGuest() {
    document.getElementById('userStatusText').innerHTML = 'Guest';
    document.getElementById('dropdownUserName').innerHTML = 'Guest User';
    document.getElementById('dropdownUserRole').innerHTML = 'View Only Mode';
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('showLoginOption').classList.remove('hidden');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    document.getElementById('navProfilePic').classList.add('hidden');
    
    // Show default user icon
    const userIcon = document.querySelector('#accountBtn .fa-user-circle');
    if (userIcon) userIcon.style.display = 'inline-block';
}

async function login(username, password) {
    const response = await apiCall('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (response && response.ok) {
        const data = await response.json();
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        
        // Fetch complete user info including profile picture
        const userResponse = await apiCall('/api/me');
        if (userResponse && userResponse.ok) {
            currentUser = await userResponse.json();
        }
        
        updateUILoggedIn();
        closeAllModals();
        showToast('Login successful!');
        
        // Refresh current page data
        if (currentPage === 'bikes') loadBikes();
        if (currentPage === 'sold') loadSold();
        return true;
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        return false;
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    updateUIGuest();
    showToast('Logged out successfully');
    if (currentPage === 'bikes') loadBikes();
    if (currentPage === 'sold') loadSold();
}

// Profile Picture Upload - FIXED
document.getElementById('uploadProfilePicBtn')?.addEventListener('click', () => {
    document.getElementById('profilePicInput').click();
});

document.getElementById('profilePicInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    showToast('Uploading profile picture...');
    
    const response = await apiCall('/api/upload-profile-picture', {
        method: 'POST',
        body: formData
    });
    
    if (response && response.ok) {
        const data = await response.json();
        
        // Update current user with new profile picture
        if (currentUser) {
            currentUser.profile_picture = data.imageUrl;
        }
        
        // Update ALL profile picture displays immediately
        updateUILoggedIn();
        
        showToast('Profile picture updated successfully!');
        closeAllModals();
        
        // Refresh profile modal if open
        if (document.getElementById('profileModal') && !document.getElementById('profileModal').classList.contains('hidden')) {
            document.getElementById('profilePreview').src = data.imageUrl;
        }
    } else {
        showToast('Failed to upload profile picture', true);
    }
});

// CRUD Operations for Bikes and Sold (keep your existing functions)
window.editBike = (id) => {
    const bike = bikes.find(b => b.id === id);
    if (bike) {
        document.getElementById('modalTitle').innerText = 'Edit Bike';
        document.getElementById('editBikeId').value = bike.id;
        document.getElementById('bikeName').value = bike.name;
        document.getElementById('bikePrice').value = bike.price.replace('Rs.', '').replace(/,/g, '').trim();
        document.getElementById('bikeYear').value = bike.year;
        document.getElementById('bikeKm').value = bike.km;
        document.getElementById('bikeLocation').value = bike.location;
        document.getElementById('bikeBrand').value = bike.brand;
        document.getElementById('bikeImageUrl').value = bike.image || '';
        const preview = document.getElementById('bikeImagePreview');
        if (bike.image) {
            preview.src = bike.image;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }
        document.getElementById('editBikeModal').classList.remove('hidden');
    }
};

window.deleteBike = async (id) => {
    if (!confirm('Delete this bike?')) return;
    const response = await apiCall(`/api/bikes/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('Bike deleted successfully');
        loadBikes();
    }
};

window.editSold = (id) => {
    const sold = soldList.find(s => s.id === id);
    if (sold) {
        document.getElementById('soldModalTitle').innerText = 'Edit Sold Entry';
        document.getElementById('editSoldId').value = sold.id;
        document.getElementById('soldName').value = sold.name;
        document.getElementById('soldPrice').value = sold.sold_price.replace('Rs.', '').replace(/,/g, '').trim();
        document.getElementById('soldMonthYear').value = sold.month_year;
        document.getElementById('soldBuyer').value = sold.buyer;
        document.getElementById('soldImageUrl').value = sold.image || '';
        const preview = document.getElementById('soldImagePreview');
        if (sold.image) {
            preview.src = sold.image;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }
        document.getElementById('editSoldModal').classList.remove('hidden');
    }
};

window.deleteSold = async (id) => {
    if (!confirm('Remove this sold record?')) return;
    const response = await apiCall(`/api/sold/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('Sold entry removed');
        loadSold();
    }
};

window.openAddBikeModal = () => {
    document.getElementById('modalTitle').innerText = 'Add New Bike';
    document.getElementById('editBikeId').value = '';
    document.getElementById('bikeName').value = '';
    document.getElementById('bikePrice').value = '';
    document.getElementById('bikeYear').value = '';
    document.getElementById('bikeKm').value = '';
    document.getElementById('bikeLocation').value = '';
    document.getElementById('bikeBrand').value = '';
    document.getElementById('bikeImageUrl').value = '';
    document.getElementById('bikeImageUpload').value = '';
    document.getElementById('bikeImagePreview').classList.add('hidden');
    document.getElementById('editBikeModal').classList.remove('hidden');
};

window.openAddSoldModal = () => {
    document.getElementById('soldModalTitle').innerText = 'Add Sold Entry';
    document.getElementById('editSoldId').value = '';
    document.getElementById('soldName').value = '';
    document.getElementById('soldPrice').value = '';
    document.getElementById('soldMonthYear').value = '';
    document.getElementById('soldBuyer').value = '';
    document.getElementById('soldImageUrl').value = '';
    document.getElementById('soldImageUpload').value = '';
    document.getElementById('soldImagePreview').classList.add('hidden');
    document.getElementById('editSoldModal').classList.remove('hidden');
};

// Save Handlers
document.getElementById('saveBikeBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editBikeId').value;
    const name = document.getElementById('bikeName').value;
    const priceRaw = document.getElementById('bikePrice').value;
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g, '')) || 0;
    const price = `Rs. ${priceNum.toLocaleString()}`;
    const year = document.getElementById('bikeYear').value;
    const km = document.getElementById('bikeKm').value;
    const location = document.getElementById('bikeLocation').value;
    const brand = document.getElementById('bikeBrand').value;
    const imageUrl = document.getElementById('bikeImageUrl').value;
    const imageFile = document.getElementById('bikeImageUpload').files[0];
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('price_num', priceNum);
    formData.append('year', year);
    formData.append('km', km);
    formData.append('location', location);
    formData.append('brand', brand);
    if (imageUrl) formData.append('image_url', imageUrl);
    if (imageFile) formData.append('image', imageFile);
    
    const url = id ? `/api/bikes/${id}` : '/api/bikes';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await apiCall(url, { method, body: formData });
        if (response && response.ok) {
            showToast(id ? 'Bike updated successfully!' : 'Bike added successfully!');
            closeAllModals();
            loadBikes();
            document.getElementById('bikeImageUpload').value = '';
        } else if (response) {
            const error = await response.json();
            showToast(error.error || 'Failed to save bike', true);
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error saving bike. Please try again.', true);
    }
});

document.getElementById('saveSoldBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editSoldId').value;
    const name = document.getElementById('soldName').value;
    const priceRaw = document.getElementById('soldPrice').value;
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g, '')) || 0;
    const soldPrice = `Rs. ${priceNum.toLocaleString()}`;
    const monthYear = document.getElementById('soldMonthYear').value;
    const buyer = document.getElementById('soldBuyer').value;
    const imageUrl = document.getElementById('soldImageUrl').value;
    const imageFile = document.getElementById('soldImageUpload').files[0];
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('sold_price', soldPrice);
    formData.append('sold_price_num', priceNum);
    formData.append('month_year', monthYear);
    formData.append('buyer', buyer);
    if (imageUrl) formData.append('image_url', imageUrl);
    if (imageFile) formData.append('image', imageFile);
    
    const url = id ? `/api/sold/${id}` : '/api/sold';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await apiCall(url, { method, body: formData });
        if (response && response.ok) {
            showToast(id ? 'Sold entry updated!' : 'Sold entry added!');
            closeAllModals();
            loadSold();
            document.getElementById('soldImageUpload').value = '';
        } else if (response) {
            const error = await response.json();
            showToast(error.error || 'Failed to save sold entry', true);
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error saving sold entry. Please try again.', true);
    }
});

// Image preview handlers
document.getElementById('bikeImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById('bikeImagePreview').src = ev.target.result;
            document.getElementById('bikeImagePreview').classList.remove('hidden');
            document.getElementById('bikeImageUrl').value = '';
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('soldImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById('soldImagePreview').src = ev.target.result;
            document.getElementById('soldImagePreview').classList.remove('hidden');
            document.getElementById('soldImageUrl').value = '';
        };
        reader.readAsDataURL(file);
    }
});

// Modal close functions
function closeAllModals() {
    const modals = ['loginModal', 'profileModal', 'settingsModal', 'changePasswordModal', 'changeUsernameModal', 'createUserModal', 'editLogoModal', 'editBikeModal', 'editSoldModal'];
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// Event listeners for modals
document.getElementById('doLoginBtn')?.addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    await login(username, password);
});

document.getElementById('showLoginOption')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginModal').classList.remove('hidden');
});

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

document.getElementById('profileMenuItem')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (token && currentUser) {
        const response = await apiCall('/api/me');
        if (response && response.ok) {
            currentUser = await response.json();
        }
        document.getElementById('profileUsername').innerText = currentUser?.username || 'Admin';
        document.getElementById('profileRole').innerText = 'Administrator';
        document.getElementById('profilePreview').src = currentUser?.profile_picture || '';
    }
    document.getElementById('profileModal').classList.remove('hidden');
});

document.getElementById('settingsMenuItem')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('settingsModal').classList.remove('hidden');
});

document.getElementById('changePasswordMenuItem')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!token) { alert('Please login first'); return; }
    document.getElementById('changePasswordModal').classList.remove('hidden');
});

document.getElementById('changeUsernameMenuItem')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!token) { alert('Please login first'); return; }
    document.getElementById('changeUsernameModal').classList.remove('hidden');
});

document.getElementById('editLogoMenuItem')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!token) { alert('Please login first'); return; }
    const currentLogo = document.getElementById('siteLogo').src;
    document.getElementById('logoPreview').src = currentLogo;
    document.getElementById('logoUrlInput').value = currentLogo;
    document.getElementById('editLogoModal').classList.remove('hidden');
});

document.getElementById('createUserMenuItem')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('createUserModal').classList.remove('hidden');
});

// Password change handler
document.getElementById('savePasswordBtn')?.addEventListener('click', async () => {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        document.getElementById('pwdError').innerText = 'New passwords do not match';
        return;
    }
    if (newPassword.length < 4) {
        document.getElementById('pwdError').innerText = 'Password must be at least 4 characters';
        return;
    }
    
    const response = await apiCall('/api/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
    });
    if (response && response.ok) {
        showToast('Password changed successfully');
        closeAllModals();
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('pwdError').innerText = '';
    } else {
        const error = await response.json();
        document.getElementById('pwdError').innerText = error.error || 'Failed to change password';
    }
});

// Username change handler
document.getElementById('saveUsernameBtn')?.addEventListener('click', async () => {
    const newUsername = document.getElementById('newUsername').value;
    if (!newUsername) {
        document.getElementById('usernameError').innerText = 'Username cannot be empty';
        return;
    }
    
    const response = await apiCall('/api/change-username', {
        method: 'POST',
        body: JSON.stringify({ newUsername })
    });
    if (response && response.ok) {
        const data = await response.json();
        token = data.token;
        localStorage.setItem('token', token);
        if (currentUser) currentUser.username = data.username;
        showToast('Username changed successfully');
        closeAllModals();
        updateUILoggedIn();
        document.getElementById('newUsername').value = '';
        document.getElementById('usernameError').innerText = '';
    } else {
        document.getElementById('usernameError').innerText = 'Username already exists';
    }
});

// Create user handler
document.getElementById('doCreateUserBtn')?.addEventListener('click', async () => {
    const username = document.getElementById('newAdminUsername').value;
    const password = document.getElementById('newAdminPassword').value;
    
    if (!username || !password) {
        document.getElementById('createUserError').innerText = 'Username and password required';
        return;
    }
    
    const response = await apiCall('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    if (response && response.ok) {
        showToast('Admin user created successfully');
        closeAllModals();
        document.getElementById('newAdminUsername').value = '';
        document.getElementById('newAdminPassword').value = '';
        document.getElementById('createUserError').innerText = '';
    } else {
        const error = await response.json();
        document.getElementById('createUserError').innerText = error.error || 'Failed to create user';
    }
});

// Logo upload handler
document.getElementById('saveLogoBtn')?.addEventListener('click', async () => {
    const logoUrl = document.getElementById('logoUrlInput').value;
    const logoFile = document.getElementById('logoUploadInput').files[0];
    
    const formData = new FormData();
    if (logoUrl) formData.append('logoUrl', logoUrl);
    if (logoFile) formData.append('logo', logoFile);
    
    const response = await apiCall('/api/settings/logo', {
        method: 'POST',
        body: formData
    });
    if (response && response.ok) {
        const data = await response.json();
        document.getElementById('siteLogo').src = data.logoUrl;
        showToast('Logo updated successfully');
        closeAllModals();
    }
});

// Logo upload input preview
document.getElementById('logoUploadInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById('logoPreview').src = ev.target.result;
            document.getElementById('logoUrlInput').value = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Clickable logo
document.getElementById('clickableLogo')?.addEventListener('click', () => {
    if (token) {
        const currentLogo = document.getElementById('siteLogo').src;
        document.getElementById('logoPreview').src = currentLogo;
        document.getElementById('logoUrlInput').value = currentLogo;
        document.getElementById('editLogoModal').classList.remove('hidden');
    } else {
        showToast('Please login as admin to change logo', true);
        document.getElementById('loginModal').classList.remove('hidden');
    }
});

// Close modal buttons
document.querySelectorAll('[id$="ModalBtn"], [id*="close"]').forEach(btn => {
    if (btn.id && (btn.id.includes('close') || btn.id.includes('Close'))) {
        btn.addEventListener('click', closeAllModals);
    }
});

// Dropdown and mobile menu
document.addEventListener('click', (e) => {
    if (!document.getElementById('accountDropdown')?.contains(e.target) && e.target !== document.getElementById('accountBtn')) {
        document.getElementById('accountDropdown')?.classList.add('hidden');
    }
});

document.getElementById('accountBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('accountDropdown')?.classList.toggle('hidden');
});

document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
    document.getElementById('mobileTabs')?.classList.toggle('hidden');
});

// Filter handlers
document.addEventListener('click', (e) => {
    if (e.target.dataset?.filter) {
        const filter = e.target.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.remove('active-filter', 'bg-blue-600', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700');
        });
        e.target.classList.add('active-filter', 'bg-blue-600', 'text-white');
        e.target.classList.remove('bg-white', 'text-gray-700');
        
        if (filter === 'all') bikes.sort((a, b) => b.id - a.id);
        else if (filter === 'price-desc') bikes.sort((a, b) => b.price_num - a.price_num);
        else if (filter === 'price-asc') bikes.sort((a, b) => a.price_num - b.price_num);
        renderBikes();
    }
});

// Initialize
async function init() {
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });
    
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
        token = savedToken;
        const valid = await checkAuth();
        if (!valid) logout();
    }
    
    // Load logo
    const logoResponse = await apiCall('/api/settings/logo');
    if (logoResponse && logoResponse.ok) {
        const data = await logoResponse.json();
        document.getElementById('siteLogo').src = data.logoUrl;
    }
    
    navigateTo('home');
}

// Add CSS animation for toasts
const style = document.createElement('style');
style.textContent = `@keyframes fadeInOut { 0% { opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; } } .toast { animation: fadeInOut 3s ease; }`;
document.head.appendChild(style);

init();
