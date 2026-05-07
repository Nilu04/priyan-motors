// Add this at the top of your app.js after the variable declarations
// Cache-busting timestamp to force fresh loads
let cacheBuster = Date.now();

// Helper function to add cache-busting to image URLs
function addCacheBuster(url) {
    if (!url) return url;
    // If it's a Base64 image, return as-is (already embedded)
    if (url.startsWith('data:')) return url;
    // Add timestamp to force fresh load
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${cacheBuster}`;
}

// Update renderBikes function to use cache-busting
function renderBikes() {
    const grid = document.getElementById('bikesGrid');
    if (!grid) return;
    if (bikes.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-motorcycle text-4xl text-gray-300 mb-3 block"></i><p class="text-gray-500">No bikes available. Admin can add new bikes.</p></div>';
        return;
    }
    grid.innerHTML = bikes.map(bike => {
        let imageUrl = bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike';
        // Add cache-busting only for external URLs
        if (imageUrl && !imageUrl.startsWith('data:')) {
            imageUrl = addCacheBuster(imageUrl);
        }
        return `
        <div class="bg-white rounded-2xl overflow-hidden shadow-md bike-card border hover:shadow-lg transition">
            <img src="${imageUrl}" class="bike-img w-full h-48 object-cover" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
            <div class="p-4"><h3 class="text-xl font-black">${escapeHtml(bike.name)}</h3><div class="text-blue-600 font-bold text-xl">${bike.price}</div>
            <div class="grid grid-cols-2 gap-1 text-xs text-gray-500 mt-2"><span><i class="far fa-calendar"></i> ${bike.year}</span><span><i class="fas fa-road"></i> ${bike.km}</span><span><i class="fas fa-map-marker-alt"></i> ${bike.location}</span><span><i class="fas fa-tag"></i> ${bike.brand}</span></div>
            ${token ? `<div class="flex gap-2 mt-4"><button onclick="editBike(${bike.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs transition"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteBike(${bike.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition"><i class="fas fa-trash"></i> Delete</button></div>` : `<a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}" class="mt-4 block bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-xl text-sm transition"><i class="fab fa-whatsapp mr-1"></i> Inquire Now</a>`}
            </div>
        </div>
    `}).join('');
}

// Update renderSold function to use cache-busting
function renderSold() {
    const grid = document.getElementById('soldGrid');
    if (!grid) return;
    if (soldList.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-check-circle text-4xl text-gray-300 mb-3 block"></i><p class="text-gray-500">No sold records yet.</p></div>';
        return;
    }
    grid.innerHTML = soldList.map(s => {
        let imageUrl = s.image || 'https://placehold.co/600x400/22C55E/white?text=Sold';
        if (imageUrl && !imageUrl.startsWith('data:')) {
            imageUrl = addCacheBuster(imageUrl);
        }
        return `
        <div class="bg-white rounded-2xl overflow-hidden shadow-md sold-card border hover:shadow-lg transition">
            <img src="${imageUrl}" class="sold-img w-full h-48 object-cover" onerror="this.src='https://placehold.co/600x400/22C55E/white?text=Sold'">
            <div class="p-4"><h3 class="text-xl font-bold">${escapeHtml(s.name)}</h3><p class="font-bold text-green-700 text-lg">${s.sold_price}</p>
            <p class="text-sm text-gray-600 mt-1"><i class="far fa-calendar-alt"></i> ${s.month_year} · Buyer: ${escapeHtml(s.buyer)}</p>
            ${token ? `<div class="flex gap-3 mt-4"><button onclick="editSold(${s.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs transition"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteSold(${s.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs transition"><i class="fas fa-trash"></i> Delete</button></div>` : `<div class="mt-3 text-gray-500 text-xs"><i class="fas fa-check-circle text-green-500"></i> Sold by Mr. Priyan Motors</div>`}
            </div>
        </div>
    `}).join('');
}

// Force refresh all data (call this after any update)
async function forceRefreshAllData() {
    console.log('🔄 Force refreshing all data...');
    // Update cache buster to break all image caches
    cacheBuster = Date.now();
    
    // Reload all data
    if (currentPage === 'bikes') {
        await loadBikes();
    }
    if (currentPage === 'sold') {
        await loadSold();
    }
    
    // Reload logo
    const logoResponse = await apiCall('/api/settings/logo');
    if (logoResponse && logoResponse.ok) {
        const data = await logoResponse.json();
        let logoUrl = data.logoUrl;
        if (logoUrl && !logoUrl.startsWith('data:')) {
            logoUrl = addCacheBuster(logoUrl);
        }
        document.getElementById('siteLogo').src = logoUrl;
    }
    
    // Reload user data if logged in
    if (token) {
        const userResponse = await apiCall('/api/me');
        if (userResponse && userResponse.ok) {
            currentUser = await userResponse.json();
            updateUILoggedIn();
        }
    }
    
    console.log('✅ Data refresh complete');
}

// Replace your init function with this
async function init() {
    console.log('🚀 Initializing app...');
    
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
    
    // Load logo with cache-busting
    const logoResponse = await apiCall('/api/settings/logo');
    if (logoResponse && logoResponse.ok) {
        const data = await logoResponse.json();
        let logoUrl = data.logoUrl;
        if (logoUrl && !logoUrl.startsWith('data:')) {
            logoUrl = addCacheBuster(logoUrl);
        }
        document.getElementById('siteLogo').src = logoUrl;
    }
    
    navigateTo('home');
    
    // Force a complete refresh after 1 second to ensure everything loads
    setTimeout(() => {
        forceRefreshAllData();
    }, 100);
}

// Add page visibility listener - refreshes when user returns to tab
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('📱 Tab became visible - refreshing data');
        forceRefreshAllData();
    }
});

// Add beforeunload to clear cache (optional)
window.addEventListener('beforeunload', () => {
    // No action needed, just for logging
    console.log('Page is being unloaded');
});

// Update all save handlers to force refresh after save
// Updated saveBikeBtn handler - FIXED version
document.getElementById('saveBikeBtn')?.addEventListener('click', async () => {
    console.log('📝 Saving bike...');
    
    const id = document.getElementById('editBikeId').value;
    const name = document.getElementById('bikeName').value;
    const priceRaw = document.getElementById('bikePrice').value;
    const year = document.getElementById('bikeYear').value;
    const km = document.getElementById('bikeKm').value;
    const location = document.getElementById('bikeLocation').value;
    const brand = document.getElementById('bikeBrand').value;
    const imageUrl = document.getElementById('bikeImageUrl').value;
    const imageFile = document.getElementById('bikeImageUpload').files[0];
    
    // Validate required fields
    if (!name) {
        showToast('Bike name is required!', true);
        return;
    }
    if (!year) {
        showToast('Year is required!', true);
        return;
    }
    if (!km) {
        showToast('Kilometers is required!', true);
        return;
    }
    if (!location) {
        showToast('Location is required!', true);
        return;
    }
    if (!brand) {
        showToast('Brand is required!', true);
        return;
    }
    
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g, '')) || 0;
    const price = `Rs. ${priceNum.toLocaleString()}`;
    
    console.log('Bike data:', { name, price, priceNum, year, km, location, brand });
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('price_num', priceNum);
    formData.append('year', year);
    formData.append('km', km);
    formData.append('location', location);
    formData.append('brand', brand);
    
    if (imageUrl) {
        formData.append('image_url', imageUrl);
    }
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const url = id ? `/api/bikes/${id}` : '/api/bikes';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await apiCall(url, { method, body: formData });
        if (response && response.ok) {
            const result = await response.json();
            console.log('Save result:', result);
            showToast(id ? 'Bike updated successfully!' : 'Bike added successfully!');
            closeAllModals();
            // Clear form
            document.getElementById('bikeName').value = '';
            document.getElementById('bikePrice').value = '';
            document.getElementById('bikeYear').value = '';
            document.getElementById('bikeKm').value = '';
            document.getElementById('bikeLocation').value = '';
            document.getElementById('bikeBrand').value = '';
            document.getElementById('bikeImageUrl').value = '';
            document.getElementById('bikeImageUpload').value = '';
            document.getElementById('bikeImagePreview').classList.add('hidden');
            // Refresh bikes list
            await loadBikes();
        } else if (response) {
            const error = await response.json();
            console.error('Server error:', error);
            showToast(error.error || 'Failed to save bike', true);
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error saving bike. Please check console.', true);
    }
});

// Updated saveSoldBtn handler - FIXED version
document.getElementById('saveSoldBtn')?.addEventListener('click', async () => {
    console.log('📝 Saving sold entry...');
    
    const id = document.getElementById('editSoldId').value;
    const name = document.getElementById('soldName').value;
    const priceRaw = document.getElementById('soldPrice').value;
    const monthYear = document.getElementById('soldMonthYear').value;
    const buyer = document.getElementById('soldBuyer').value;
    const imageUrl = document.getElementById('soldImageUrl').value;
    const imageFile = document.getElementById('soldImageUpload').files[0];
    
    // Validate required fields
    if (!name) {
        showToast('Bike name is required!', true);
        return;
    }
    if (!monthYear) {
        showToast('Month/Year is required!', true);
        return;
    }
    if (!buyer) {
        showToast('Buyer name is required!', true);
        return;
    }
    
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g, '')) || 0;
    const soldPrice = `Rs. ${priceNum.toLocaleString()}`;
    
    console.log('Sold data:', { name, soldPrice, priceNum, monthYear, buyer });
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('sold_price', soldPrice);
    formData.append('sold_price_num', priceNum);
    formData.append('month_year', monthYear);
    formData.append('buyer', buyer);
    
    if (imageUrl) {
        formData.append('image_url', imageUrl);
    }
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const url = id ? `/api/sold/${id}` : '/api/sold';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await apiCall(url, { method, body: formData });
        if (response && response.ok) {
            const result = await response.json();
            console.log('Save result:', result);
            showToast(id ? 'Sold entry updated!' : 'Sold entry added!');
            closeAllModals();
            // Clear form
            document.getElementById('soldName').value = '';
            document.getElementById('soldPrice').value = '';
            document.getElementById('soldMonthYear').value = '';
            document.getElementById('soldBuyer').value = '';
            document.getElementById('soldImageUrl').value = '';
            document.getElementById('soldImageUpload').value = '';
            document.getElementById('soldImagePreview').classList.add('hidden');
            // Refresh sold list
            await loadSold();
        } else if (response) {
            const error = await response.json();
            console.error('Server error:', error);
            showToast(error.error || 'Failed to save sold entry', true);
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error saving sold entry. Please check console.', true);
    }
});

// Update logo save handler
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
        let newLogoUrl = data.logoUrl;
        if (newLogoUrl && !newLogoUrl.startsWith('data:')) {
            newLogoUrl = addCacheBuster(newLogoUrl);
        }
        document.getElementById('siteLogo').src = newLogoUrl;
        showToast('Logo updated successfully');
        closeAllModals();
        await forceRefreshAllData();
    }
});
