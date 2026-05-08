// app.js - Complete Working Version - FINAL FIX
const API_URL = '';
let token = localStorage.getItem('token');
let currentUser = null;
let currentPage = 'home';
let bikes = [];
let soldList = [];
let socialLinks = { whatsapp_group: '', facebook_page: '' };
let comments = {};
let feedbacks = {};

// Load comments and feedbacks from localStorage
function loadComments() {
    const saved = localStorage.getItem('bikeComments');
    if (saved) {
        comments = JSON.parse(saved);
    }
}

function saveComments() {
    localStorage.setItem('bikeComments', JSON.stringify(comments));
}

function loadFeedbacks() {
    const saved = localStorage.getItem('soldFeedbacks');
    if (saved) {
        feedbacks = JSON.parse(saved);
    }
}

function saveFeedbacks() {
    localStorage.setItem('soldFeedbacks', JSON.stringify(feedbacks));
}

function addComment(bikeId, commentText, userName) {
    if (!commentText.trim()) return;
    if (!comments[bikeId]) comments[bikeId] = [];
    comments[bikeId].push({
        id: Date.now(),
        text: commentText,
        user: userName,
        date: new Date().toLocaleString(),
        replies: []
    });
    saveComments();
    showBikeDetails(bikeId);
}

function addReply(bikeId, commentId, replyText, userName) {
    if (!replyText.trim()) return;
    const comment = comments[bikeId]?.find(c => c.id === commentId);
    if (comment) {
        if (!comment.replies) comment.replies = [];
        comment.replies.push({
            id: Date.now(),
            text: replyText,
            user: userName,
            date: new Date().toLocaleString()
        });
        saveComments();
        showBikeDetails(bikeId);
    }
}

function deleteComment(bikeId, commentId) {
    if (!token) {
        showToast('Please login as admin to delete comments', true);
        return;
    }
    if (confirm('Are you sure you want to delete this comment?')) {
        comments[bikeId] = comments[bikeId].filter(c => c.id !== commentId);
        saveComments();
        showBikeDetails(bikeId);
        showToast('Comment deleted successfully');
    }
}

function addFeedback(soldId, rating, comment, userName) {
    if (!feedbacks[soldId]) feedbacks[soldId] = [];
    feedbacks[soldId].push({
        id: Date.now(),
        rating: rating,
        comment: comment,
        user: userName,
        date: new Date().toLocaleString()
    });
    saveFeedbacks();
    showSoldDetails(soldId);
}

// ============= HELPER FUNCTIONS =============
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); color: white; padding: 12px 24px; border-radius: 50px; z-index: 10000; animation: fadeInOut 3s ease;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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

function closeAllModals() {
    const modals = ['loginModal', 'settingsModal', 'changePasswordModal', 'changeUsernameModal', 'editBikeModal', 'editSoldModal', 'editLogoModal', 'socialLinksModal', 'bikeDetailsModal', 'soldDetailsModal', 'imagePreviewModal'];
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.style.display = 'none';
        }
    });
}

window.closeModal = function() {
    closeAllModals();
};

// ============= API CALLS =============
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
        if (response.status === 401) {
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

// ============= IMAGE PREVIEW FUNCTION =============
window.showImagePreview = function(imageUrl) {
    let modal = document.getElementById('imagePreviewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imagePreviewModal';
        modal.className = 'fixed inset-0 z-[500] hidden items-center justify-center modal-overlay p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl w-full max-w-3xl mx-auto p-4">
                <div class="flex justify-end mb-2">
                    <button onclick="window.closeModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                <img id="previewImage" src="" class="w-full h-auto max-h-[80vh] object-contain rounded-lg">
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('previewImage').src = imageUrl;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

// ============= MARK AS SOLD FUNCTION =============
window.markAsSold = async function(bikeId) {
    if (!token) {
        showToast('Please login as admin to mark as sold', true);
        document.getElementById('loginModal').classList.remove('hidden');
        return;
    }
    
    const bike = bikes.find(b => b._id === bikeId);
    if (!bike) return;
    
    const buyerName = prompt('Enter buyer name:', '');
    if (!buyerName) return;
    
    const soldPrice = prompt('Enter sold price (Rs.):', bike.price.replace('Rs.', '').trim());
    if (!soldPrice) return;
    
    const monthYear = prompt('Enter month/year (e.g., May 2025):', new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
    if (!monthYear) return;
    
    const soldData = {
        name: bike.name,
        sold_price: `Rs. ${parseInt(soldPrice.replace(/[^0-9]/g, '')).toLocaleString()}`,
        sold_price_num: parseInt(soldPrice.replace(/[^0-9]/g, '')) || 0,
        month_year: monthYear,
        buyer: buyerName,
        image: bike.image
    };
    
    const response = await apiCall('/api/sold', {
        method: 'POST',
        body: JSON.stringify(soldData)
    });
    
    if (response && response.ok) {
        await apiCall(`/api/bikes/${bikeId}`, { method: 'DELETE' });
        showToast('Bike marked as sold and moved to sold page!');
        loadBikes();
        loadSold();
        closeAllModals();
    } else {
        showToast('Failed to mark as sold', true);
    }
};

// ============= ADD BIKE AND ADD SOLD FUNCTIONS =============
window.openAddBikeModal = function() {
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

window.openAddSoldModal = function() {
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

// ============= DETAILS MODAL FUNCTIONS =============
window.showBikeDetails = function(bikeId) {
    const bike = bikes.find(b => b._id === bikeId);
    if (!bike) return;
    
    const bikeComments = comments[bikeId] || [];
    
    const commentsHtml = bikeComments.map(comment => `
        <div class="bg-gray-50 rounded-lg p-3 mb-3">
            <div class="flex justify-between items-start">
                <div>
                    <span class="font-semibold text-blue-600">${escapeHtml(comment.user)}</span>
                    <span class="text-xs text-gray-400 ml-2">${comment.date}</span>
                </div>
                <div>
                    <button onclick="window.showReplyForm('${bikeId}', ${comment.id})" class="text-xs text-blue-500 hover:text-blue-700 mr-2">Reply</button>
                    ${token ? `<button onclick="window.deleteComment('${bikeId}', ${comment.id})" class="text-xs text-red-500 hover:text-red-700"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </div>
            </div>
            <p class="text-gray-700 mt-1">${escapeHtml(comment.text)}</p>
            <div id="replies-${comment.id}" class="ml-4 mt-2">
                ${(comment.replies || []).map(reply => `
                    <div class="bg-gray-100 rounded-lg p-2 mb-2">
                        <div><span class="font-semibold text-green-600">${escapeHtml(reply.user)}</span> <span class="text-xs text-gray-400">${reply.date}</span></div>
                        <p class="text-gray-700 text-sm">${escapeHtml(reply.text)}</p>
                    </div>
                `).join('')}
            </div>
            <div id="reply-form-${comment.id}" class="hidden mt-2">
                <div class="flex gap-2">
                    <input type="text" id="reply-input-${comment.id}" placeholder="Write a reply..." class="flex-1 border rounded-lg px-3 py-1 text-sm">
                    <button onclick="window.submitReply('${bikeId}', ${comment.id})" class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">Reply</button>
                </div>
            </div>
        </div>
    `).join('');
    
    const modalHtml = `
        <div class="bg-white rounded-2xl w-full max-w-3xl mx-auto p-6 max-h-[85vh] overflow-y-auto">
            <div class="flex justify-between items-start mb-4">
                <h2 class="text-2xl font-black text-blue-600">${escapeHtml(bike.name)}</h2>
                <button onclick="window.closeModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div class="relative">
                <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" class="w-full h-80 object-cover rounded-xl mb-4 cursor-pointer" onclick="window.showImagePreview('${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}')" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
                <button onclick="window.showImagePreview('${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}')" class="absolute bottom-6 right-6 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition">
                    <i class="fas fa-search-plus"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">💰 Price</p><p class="text-xl font-bold text-blue-600">${bike.price}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">🏷️ Brand</p><p class="text-lg font-semibold">${escapeHtml(bike.brand)}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📅 Year</p><p class="text-lg font-semibold">${bike.year}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📊 Kilometers</p><p class="text-lg font-semibold">${bike.km}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📍 Location</p><p class="text-lg font-semibold">${escapeHtml(bike.location)}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">🕐 Added On</p><p class="text-lg font-semibold">${new Date(bike.created_at).toLocaleDateString()}</p></div>
            </div>
            
            <!-- Comments Section -->
            <div class="mt-6 border-t pt-4">
                <h3 class="text-lg font-bold mb-3">💬 Comments & Questions</h3>
                <div class="mb-4">
                    <div class="flex gap-2">
                        <input type="text" id="comment-input-${bikeId}" placeholder="Write a comment or ask a question..." class="flex-1 border rounded-lg px-4 py-2">
                        <button onclick="window.submitComment('${bikeId}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Post</button>
                    </div>
                </div>
                <div id="comments-list-${bikeId}" class="max-h-60 overflow-y-auto">
                    ${commentsHtml || '<p class="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>'}
                </div>
            </div>
            
            <div class="mt-6 flex gap-3 flex-wrap">
                <a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}%20(${bike.price})" target="_blank" class="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 rounded-lg transition"><i class="fab fa-whatsapp"></i> Inquire Now on WhatsApp</a>
                ${token ? `
                    <button onclick="window.editBike('${bike._id}'); window.closeModal();" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg transition"><i class="fas fa-edit"></i> Edit Bike</button>
                    <button onclick="window.deleteBike('${bike._id}'); window.closeModal();" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"><i class="fas fa-trash"></i> Delete Bike</button>
                ` : ''}
                <button onclick="window.markAsSold('${bike._id}')" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition"><i class="fas fa-tag"></i> Mark as Sold</button>
                <button onclick="window.closeModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg transition">Close</button>
            </div>
        </div>
    `;
    
    let modal = document.getElementById('bikeDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bikeDetailsModal';
        modal.className = 'fixed inset-0 z-[400] hidden items-center justify-center modal-overlay p-4';
        document.body.appendChild(modal);
    }
    modal.innerHTML = modalHtml;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.submitComment = function(bikeId) {
    const input = document.getElementById(`comment-input-${bikeId}`);
    const commentText = input.value;
    if (!commentText.trim()) return;
    
    const userName = token && currentUser ? currentUser.username : 'Customer';
    addComment(bikeId, commentText, userName);
    input.value = '';
};

window.showReplyForm = function(bikeId, commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) form.classList.toggle('hidden');
};

window.submitReply = function(bikeId, commentId) {
    const input = document.getElementById(`reply-input-${commentId}`);
    const replyText = input.value;
    if (!replyText.trim()) return;
    
    const userName = token && currentUser ? currentUser.username : 'Admin';
    addReply(bikeId, commentId, replyText, userName);
    input.value = '';
    document.getElementById(`reply-form-${commentId}`).classList.add('hidden');
};

window.deleteComment = deleteComment;

// ============= SOLD DETAILS WITH FEEDBACK =============
window.showSoldDetails = function(soldId) {
    const sold = soldList.find(s => s._id === soldId);
    if (!sold) return;
    
    const soldFeedbacks = feedbacks[soldId] || [];
    
    const feedbacksHtml = soldFeedbacks.map(fb => `
        <div class="bg-gray-50 rounded-lg p-3 mb-3">
            <div class="flex items-center gap-2 mb-1">
                <div class="flex text-yellow-500">
                    ${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}
                </div>
                <span class="font-semibold text-blue-600">${escapeHtml(fb.user)}</span>
                <span class="text-xs text-gray-400">${fb.date}</span>
            </div>
            <p class="text-gray-700">${escapeHtml(fb.comment)}</p>
        </div>
    `).join('');
    
    const modalHtml = `
        <div class="bg-white rounded-2xl w-full max-w-2xl mx-auto p-6 max-h-[85vh] overflow-y-auto">
            <div class="flex justify-between items-start mb-4">
                <h2 class="text-2xl font-black text-green-600">✅ ${escapeHtml(sold.name)}</h2>
                <button onclick="window.closeModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            ${sold.image ? `
                <div class="relative">
                    <img src="${sold.image}" class="w-full h-80 object-cover rounded-xl mb-4 cursor-pointer" onclick="window.showImagePreview('${sold.image}')" onerror="this.style.display='none'">
                    <button onclick="window.showImagePreview('${sold.image}')" class="absolute bottom-6 right-6 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
            ` : ''}
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">💰 Sold Price</p><p class="text-xl font-bold text-green-600">${sold.sold_price}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">👤 Buyer Name</p><p class="text-lg font-semibold">${escapeHtml(sold.buyer)}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">📅 Sold Date</p><p class="text-lg font-semibold">${sold.month_year}</p></div>
                <div class="bg-gray-50 p-3 rounded-lg"><p class="text-gray-500 text-sm">🕐 Recorded On</p><p class="text-lg font-semibold">${new Date(sold.created_at).toLocaleDateString()}</p></div>
            </div>
            
            <!-- Customer Feedback Section -->
            <div class="mt-6 border-t pt-4">
                <h3 class="text-lg font-bold mb-3">⭐ Customer Feedback</h3>
                <div class="mb-4">
                    <div class="mb-2">
                        <p class="text-sm text-gray-600 mb-2">Rate your experience:</p>
                        <div class="flex gap-1 mb-3" id="rating-stars-${soldId}">
                            ${[1,2,3,4,5].map(i => `<i class="fas fa-star text-gray-300 text-2xl cursor-pointer hover:text-yellow-500" data-rating="${i}" onclick="window.setRating('${soldId}', ${i})"></i>`).join('')}
                        </div>
                        <input type="hidden" id="selected-rating-${soldId}" value="0">
                        <textarea id="feedback-comment-${soldId}" placeholder="Share your experience with this purchase..." class="w-full border rounded-lg px-4 py-2 mb-2" rows="2"></textarea>
                        <button onclick="window.submitFeedback('${soldId}')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Submit Feedback</button>
                    </div>
                </div>
                <div id="feedbacks-list-${soldId}" class="max-h-60 overflow-y-auto">
                    ${feedbacksHtml || '<p class="text-gray-500 text-center py-4">No feedback yet. Be the first to share your experience!</p>'}
                </div>
            </div>
            
            <div class="mt-6 flex gap-3">
                ${token ? `
                    <button onclick="window.editSold('${sold._id}'); window.closeModal();" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg transition"><i class="fas fa-edit"></i> Edit Entry</button>
                    <button onclick="window.deleteSold('${sold._id}'); window.closeModal();" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"><i class="fas fa-trash"></i> Delete Entry</button>
                ` : ''}
                <button onclick="window.closeModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded-lg transition">Close</button>
            </div>
        </div>
    `;
    
    let modal = document.getElementById('soldDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'soldDetailsModal';
        modal.className = 'fixed inset-0 z-[400] hidden items-center justify-center modal-overlay p-4';
        document.body.appendChild(modal);
    }
    modal.innerHTML = modalHtml;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.setRating = function(soldId, rating) {
    document.getElementById(`selected-rating-${soldId}`).value = rating;
    for (let i = 1; i <= 5; i++) {
        const star = document.querySelector(`#rating-stars-${soldId} i[data-rating="${i}"]`);
        if (star) {
            if (i <= rating) {
                star.classList.remove('text-gray-300');
                star.classList.add('text-yellow-500');
            } else {
                star.classList.remove('text-yellow-500');
                star.classList.add('text-gray-300');
            }
        }
    }
};

window.submitFeedback = function(soldId) {
    const rating = parseInt(document.getElementById(`selected-rating-${soldId}`).value);
    const comment = document.getElementById(`feedback-comment-${soldId}`).value;
    
    if (rating === 0) {
        showToast('Please select a rating!', true);
        return;
    }
    if (!comment.trim()) {
        showToast('Please write your feedback!', true);
        return;
    }
    
    const userName = token && currentUser ? currentUser.username : 'Customer';
    addFeedback(soldId, rating, comment, userName);
    document.getElementById(`selected-rating-${soldId}`).value = 0;
    document.getElementById(`feedback-comment-${soldId}`).value = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.querySelector(`#rating-stars-${soldId} i[data-rating="${i}"]`);
        if (star) {
            star.classList.remove('text-yellow-500');
            star.classList.add('text-gray-300');
        }
    }
};

// ============= PAGE TEMPLATES WITH BUTTONS =============
const templates = {
    home: () => `
        <header class="hero-gradient min-h-[75vh] flex items-center justify-center text-center text-white">
            <div class="container mx-auto px-4 py-8">
                <span class="inline-block bg-blue-600/80 px-4 py-1 rounded-full text-sm font-bold mb-4">#RideTheExtraordinary</span>
                <h1 class="text-4xl md:text-7xl font-black mb-4">Own Your <span class="text-blue-400">Dream Machine</span></h1>
                <p class="text-base md:text-2xl text-gray-200 max-w-3xl mx-auto mb-6">Premium new & used motorcycles | Main Street, Kiran, Batticaloa</p>
                <div class="flex justify-center gap-4 flex-wrap"><button onclick="window.navigateTo('bikes')" class="bg-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition">Explore Bikes</button><button onclick="window.navigateTo('exchange')" class="bg-transparent border-2 border-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 transition">Sell Your Bike</button></div>
                <div class="grid grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto"><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">500+</div><div class="text-xs">Bikes Sold</div></div><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">100%</div><div class="text-xs">Trust</div></div><div class="bg-white/10 rounded-2xl p-3"><div class="text-2xl font-black text-blue-400">24/7</div><div class="text-xs">Support</div></div></div>
            </div>
        </header>
        <section class="py-16 bg-white text-center"><h2 class="text-3xl font-bold mb-8">Why Choose <span class="text-blue-600">Mr. Priyan Motors?</span></h2><div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4"><div><i class="fas fa-shield-alt text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Trusted Dealer</h3><p class="text-gray-600">Since 2021</p></div><div><i class="fas fa-hand-holding-usd text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Best Exchange</h3><p class="text-gray-600">Instant valuation</p></div><div><i class="fas fa-file-signature text-blue-600 text-4xl"></i><h3 class="font-bold text-xl mt-2">Hassle-free Docs</h3><p class="text-gray-600">Full support</p></div></div></section>
    `,
    
    bikes: () => `
        <div class="container mx-auto px-4 py-8">
            <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div><h1 class="text-3xl md:text-4xl font-black">🔥 Available Motorcycles</h1><p class="text-gray-600">Click on any bike to view details, comment, or inquire</p></div>
                ${token ? `<button onclick="window.openAddBikeModal()" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-bold transition"><i class="fas fa-plus"></i> Add New Bike</button>` : ''}
            </div>
            <div class="flex gap-2 mb-6 flex-wrap"><button data-filter="all" class="filter-chip active-filter px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition">All Bikes</button><button data-filter="price-desc" class="filter-chip px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition">Price High-Low</button><button data-filter="price-asc" class="filter-chip px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition">Price Low-High</button></div>
            <div id="bikesGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
    `,
    
    sold: () => `
        <div class="container mx-auto px-4 py-8">
            <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div><h1 class="text-3xl md:text-4xl font-black">✅ Recently Sold Bikes</h1><p class="text-gray-500">Click on any sold bike to view details and leave feedback</p></div>
                ${token ? `<button onclick="window.openAddSoldModal()" class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-bold transition"><i class="fas fa-plus"></i> Add Sold Entry</button>` : ''}
            </div>
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
                <div>
                    <h1 class="text-3xl md:text-5xl font-black mb-6">Visit Our <span class="text-blue-600">Showroom</span></h1>
                    <div class="space-y-6 text-lg">
                        <div class="flex items-start gap-4"><i class="fas fa-map-marker-alt text-blue-600 text-2xl mt-1"></i><div><p class="font-semibold">Address</p><p class="text-gray-600">Main Street, Kiran, Batticaloa, Sri Lanka</p></div></div>
                        <div class="flex items-start gap-4"><i class="fas fa-phone-alt text-blue-600 text-2xl mt-1"></i><div><p class="font-semibold">Phone / WhatsApp</p><p class="text-gray-600">075 350 3111</p></div></div>
                        <div class="flex items-start gap-4"><i class="fas fa-clock text-blue-600 text-2xl mt-1"></i><div><p class="font-semibold">Business Hours</p><p class="text-gray-600">Monday - Sunday: 9:00 AM - 8:00 PM</p></div></div>
                        <div class="flex items-start gap-4"><i class="fas fa-envelope text-blue-600 text-2xl mt-1"></i><div><p class="font-semibold">Email</p><p class="text-gray-600">info@priyanmotors.lk</p></div></div>
                    </div>
                    <div class="mt-8 flex gap-4 flex-wrap">
                        <a href="https://wa.me/94753503111" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition"><i class="fab fa-whatsapp mr-2"></i> WhatsApp Us</a>
                        <a href="${socialLinks.whatsapp_group || 'https://chat.whatsapp.com/yourinvitecode'}" target="_blank" class="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition"><i class="fab fa-whatsapp mr-2"></i> Join WhatsApp Group</a>
                        <a href="${socialLinks.facebook_page || 'https://facebook.com/yourpage'}" target="_blank" class="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3 rounded-xl font-bold transition"><i class="fab fa-facebook mr-2"></i> Follow on Facebook</a>
                        <a href="tel:0753503111" class="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition"><i class="fas fa-phone mr-2"></i> Call Now</a>
                    </div>
                    ${token ? `<button id="editSocialLinksBtn" class="mt-6 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"><i class="fas fa-edit"></i> Edit Social Links (Admin)</button>` : ''}
                </div>
                <div class="bg-gray-200 rounded-2xl h-80 flex flex-col items-center justify-center"><i class="fas fa-map-marked-alt text-4xl text-gray-500 mb-3"></i><p class="text-gray-600 text-center px-4">📍 Main Street, Kiran<br>Batticaloa, Sri Lanka</p><p class="text-xs text-gray-500 mt-2">Google Map location available</p></div>
            </div>
        </div>
    `
};

// ============= NAVIGATION =============
window.navigateTo = function(page) {
    console.log('Navigating to:', page);
    currentPage = page;
    
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active-page');
        } else {
            link.classList.remove('active-page');
        }
    });
    
    const pageContent = document.getElementById('pageContent');
    if (pageContent && templates[page]) {
        pageContent.innerHTML = templates[page]();
    }
    
    if (page === 'bikes') loadBikes();
    if (page === 'sold') loadSold();
    if (page === 'contact') {
        loadSocialLinks();
        setTimeout(() => {
            const editBtn = document.getElementById('editSocialLinksBtn');
            if (editBtn) {
                editBtn.onclick = () => {
                    document.getElementById('socialLinksModal').classList.remove('hidden');
                    loadSocialLinksToModal();
                };
            }
        }, 100);
    }
    
    window.scrollTo(0, 0);
    const mobileTabs = document.getElementById('mobileTabs');
    if (mobileTabs) mobileTabs.classList.add('hidden');
};

// ============= LOAD DATA =============
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

async function loadSocialLinks() {
    const response = await apiCall('/api/settings/social');
    if (response && response.ok) {
        socialLinks = await response.json();
    }
}

async function loadSocialLinksToModal() {
    const response = await apiCall('/api/settings/social');
    if (response && response.ok) {
        const links = await response.json();
        document.getElementById('whatsappGroupLink').value = links.whatsapp_group || '';
        document.getElementById('facebookPageLink').value = links.facebook_page || '';
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
        <div class="bg-white rounded-2xl overflow-hidden shadow-md bike-card border hover:shadow-lg transition cursor-pointer" onclick="window.showBikeDetails('${bike._id}')">
            <img src="${bike.image || 'https://placehold.co/600x400/1E3A8A/white?text=Bike'}" class="bike-img w-full h-48 object-cover" onerror="this.src='https://placehold.co/600x400/1E3A8A/white?text=Bike'">
            <div class="p-4">
                <h3 class="text-xl font-black">${escapeHtml(bike.name)}</h3>
                <div class="text-blue-600 font-bold text-xl">${bike.price}</div>
                <div class="grid grid-cols-2 gap-1 text-xs text-gray-500 mt-2">
                    <span><i class="far fa-calendar"></i> ${bike.year}</span>
                    <span><i class="fas fa-road"></i> ${bike.km}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${bike.location}</span>
                    <span><i class="fas fa-tag"></i> ${bike.brand}</span>
                </div>
                <div class="mt-3 flex gap-2">
                    <span class="text-xs text-gray-400">🔍 Click for details</span>
                    <a href="https://wa.me/94753503111?text=I'm%20interested%20in%20${encodeURIComponent(bike.name)}%20(${bike.price})" target="_blank" class="text-xs text-green-600 hover:text-green-800" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i> Inquire</a>
                    ${token ? `<button onclick="event.stopPropagation(); window.markAsSold('${bike._id}')" class="text-xs text-purple-600 hover:text-purple-800"><i class="fas fa-tag"></i> Mark Sold</button>` : ''}
                </div>
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
        <div class="bg-white rounded-2xl overflow-hidden shadow-md sold-card border-l-8 border-green-500 hover:shadow-lg transition cursor-pointer" onclick="window.showSoldDetails('${s._id}')">
            <div class="p-4">
                <h3 class="text-xl font-bold">${escapeHtml(s.name)}</h3>
                <p class="font-bold text-green-700 text-lg">${s.sold_price}</p>
                <p class="text-sm text-gray-600 mt-1"><i class="far fa-calendar-alt"></i> ${s.month_year} · Buyer: ${escapeHtml(s.buyer)}</p>
                ${s.image ? `<div class="mt-2"><img src="${s.image}" class="w-full h-32 object-cover rounded-lg" onclick="event.stopPropagation(); window.showImagePreview('${s.image}')" onerror="this.style.display='none'"></div>` : ''}
                <div class="mt-2 text-xs text-gray-400">🔍 Click for details | ⭐ Leave feedback</div>
            </div>
        </div>
    `).join('');
}

// ============= CRUD OPERATIONS =============
window.editBike = (id) => {
    const bike = bikes.find(b => b._id === id);
    if (bike) {
        document.getElementById('modalTitle').innerText = 'Edit Bike';
        document.getElementById('editBikeId').value = bike._id;
        document.getElementById('bikeName').value = bike.name;
        document.getElementById('bikePrice').value = bike.price.replace('Rs.', '').replace(/,/g, '').trim();
        document.getElementById('bikeYear').value = bike.year;
        document.getElementById('bikeKm').value = bike.km;
        document.getElementById('bikeLocation').value = bike.location;
        document.getElementById('bikeBrand').value = bike.brand;
        document.getElementById('bikeImageUrl').value = bike.image || '';
        const bikePreview = document.getElementById('bikeImagePreview');
        if (bike.image) {
            bikePreview.src = bike.image;
            bikePreview.classList.remove('hidden');
        } else {
            bikePreview.classList.add('hidden');
        }
        document.getElementById('editBikeModal').classList.remove('hidden');
    }
};

window.deleteBike = async (id) => {
    if (!confirm('Are you sure you want to delete this bike?')) return;
    const response = await apiCall(`/api/bikes/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('Bike deleted successfully');
        loadBikes();
    } else {
        showToast('Failed to delete bike', true);
    }
};

window.editSold = (id) => {
    const sold = soldList.find(s => s._id === id);
    if (sold) {
        document.getElementById('soldModalTitle').innerText = 'Edit Sold Entry';
        document.getElementById('editSoldId').value = sold._id;
        document.getElementById('soldName').value = sold.name;
        document.getElementById('soldPrice').value = sold.sold_price.replace('Rs.', '').replace(/,/g, '').trim();
        document.getElementById('soldMonthYear').value = sold.month_year;
        document.getElementById('soldBuyer').value = sold.buyer;
        document.getElementById('soldImageUrl').value = sold.image || '';
        const soldPreview = document.getElementById('soldImagePreview');
        if (sold.image) {
            soldPreview.src = sold.image;
            soldPreview.classList.remove('hidden');
        } else {
            soldPreview.classList.add('hidden');
        }
        document.getElementById('editSoldModal').classList.remove('hidden');
    }
};

window.deleteSold = async (id) => {
    if (!confirm('Are you sure you want to remove this sold record?')) return;
    const response = await apiCall(`/api/sold/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        showToast('Sold entry removed successfully');
        loadSold();
    } else {
        showToast('Failed to delete sold entry', true);
    }
};

// ============= SAVE HANDLERS =============
document.getElementById('saveBikeBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editBikeId').value;
    const name = document.getElementById('bikeName').value;
    const priceRaw = document.getElementById('bikePrice').value;
    const year = document.getElementById('bikeYear').value;
    const km = document.getElementById('bikeKm').value;
    const location = document.getElementById('bikeLocation').value;
    const brand = document.getElementById('bikeBrand').value;
    const imageUrl = document.getElementById('bikeImageUrl').value;
    const imageFile = document.getElementById('bikeImageUpload').files[0];
    
    if (!name || !year || !km || !location || !brand) {
        showToast('Please fill all required fields!', true);
        return;
    }
    
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g, '')) || 0;
    const price = `Rs. ${priceNum.toLocaleString()}`;
    
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
    
    const response = await apiCall(url, { method, body: formData });
    if (response && response.ok) {
        showToast(id ? 'Bike updated successfully!' : 'Bike added successfully!');
        closeAllModals();
        loadBikes();
    } else if (response) {
        const error = await response.json();
        showToast(error.error || 'Failed to save bike', true);
    }
});

document.getElementById('saveSoldBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editSoldId').value;
    const name = document.getElementById('soldName').value;
    const priceRaw = document.getElementById('soldPrice').value;
    const monthYear = document.getElementById('soldMonthYear').value;
    const buyer = document.getElementById('soldBuyer').value;
    const imageUrl = document.getElementById('soldImageUrl').value;
    const imageFile = document.getElementById('soldImageUpload').files[0];
    
    if (!name || !monthYear || !buyer) {
        showToast('Please fill all required fields!', true);
        return;
    }
    
    const priceNum = parseInt(priceRaw.replace(/[^0-9]/g, '')) || 0;
    const soldPrice = `Rs. ${priceNum.toLocaleString()}`;
    
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
    
    const response = await apiCall(url, { method, body: formData });
    if (response && response.ok) {
        showToast(id ? 'Sold entry updated!' : 'Sold entry added!');
        closeAllModals();
        loadSold();
    } else if (response) {
        const error = await response.json();
        showToast(error.error || 'Failed to save sold entry', true);
    }
});

document.getElementById('saveSocialLinksBtn')?.addEventListener('click', async () => {
    const whatsapp_group = document.getElementById('whatsappGroupLink').value;
    const facebook_page = document.getElementById('facebookPageLink').value;
    
    const response = await apiCall('/api/settings/social', {
        method: 'POST',
        body: JSON.stringify({ whatsapp_group, facebook_page })
    });
    if (response && response.ok) {
        showToast('Social links updated successfully!');
        closeAllModals();
        loadSocialLinks();
        if (currentPage === 'contact') {
            window.navigateTo('contact');
        }
    }
});

// ============= SETTINGS & AUTHENTICATION =============
document.getElementById('settingsMenuItem')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!token) {
        showToast('Please login first to access settings', true);
        return;
    }
    document.getElementById('settingsModal').classList.remove('hidden');
});

document.getElementById('changePasswordMenuItem')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!token) {
        showToast('Please login first', true);
        return;
    }
    document.getElementById('changePasswordModal').classList.remove('hidden');
});

document.getElementById('changeUsernameMenuItem')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!token) {
        showToast('Please login first', true);
        return;
    }
    document.getElementById('changeUsernameModal').classList.remove('hidden');
});

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
        showToast('Password changed successfully! Please login again.');
        closeAllModals();
        logout();
    } else {
        const error = await response.json();
        document.getElementById('pwdError').innerText = error.error || 'Failed to change password';
    }
});

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
        showToast('Username changed successfully! Please login again.');
        closeAllModals();
        logout();
    } else {
        const error = await response.json();
        document.getElementById('usernameError').innerText = error.error || 'Username already exists';
    }
});

async function checkAuth() {
    if (!token) return false;
    const response = await apiCall('/api/verify-token');
    if (response && response.ok) {
        const userResponse = await apiCall('/api/me');
        if (userResponse && userResponse.ok) {
            currentUser = await userResponse.json();
        }
        document.getElementById('userStatusText').innerHTML = 'Admin';
        document.getElementById('dropdownUserName').innerHTML = `${currentUser?.username || 'Admin'} (Admin)`;
        document.getElementById('dropdownUserRole').innerHTML = '● Edit Mode';
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('showLoginOption').classList.add('hidden');
        document.getElementById('editLogoMenuItem').classList.remove('hidden');
        return true;
    }
    return false;
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
        
        const userResponse = await apiCall('/api/me');
        if (userResponse && userResponse.ok) {
            currentUser = await userResponse.json();
        }
        
        document.getElementById('userStatusText').innerHTML = 'Admin';
        document.getElementById('dropdownUserName').innerHTML = `${currentUser?.username || 'Admin'} (Admin)`;
        document.getElementById('dropdownUserRole').innerHTML = '● Edit Mode';
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('showLoginOption').classList.add('hidden');
        document.getElementById('editLogoMenuItem').classList.remove('hidden');
        closeAllModals();
        showToast('Login successful!');
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
    document.getElementById('userStatusText').innerHTML = 'Guest';
    document.getElementById('dropdownUserName').innerHTML = 'Guest User';
    document.getElementById('dropdownUserRole').innerHTML = 'View Only Mode';
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('showLoginOption').classList.remove('hidden');
    document.getElementById('editLogoMenuItem').classList.add('hidden');
    showToast('Logged out successfully');
    if (currentPage === 'bikes') loadBikes();
    if (currentPage === 'sold') loadSold();
}

// ============= EVENT LISTENERS =============
document.getElementById('doLoginBtn')?.addEventListener('click', () => {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    login(username, password);
});

document.getElementById('showLoginOption')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginModal').classList.remove('hidden');
});

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

document.getElementById('accountBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('accountDropdown').classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!document.getElementById('accountDropdown')?.contains(e.target) && e.target !== document.getElementById('accountBtn')) {
        document.getElementById('accountDropdown')?.classList.add('hidden');
    }
});

document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
    document.getElementById('mobileTabs').classList.toggle('hidden');
});

document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        window.navigateTo(link.dataset.page);
    });
});

// Close modal buttons
document.getElementById('closeModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeSoldModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeLogoModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeLoginModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeSettingsModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closePasswordModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeUsernameModalBtn')?.addEventListener('click', closeAllModals);
document.getElementById('closeSocialLinksModalBtn')?.addEventListener('click', closeAllModals);

// Image preview for bike
document.getElementById('bikeImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('bikeImagePreview').src = ev.target.result;
            document.getElementById('bikeImagePreview').classList.remove('hidden');
            document.getElementById('bikeImageUrl').value = '';
        };
        reader.readAsDataURL(file);
    }
});

// Image preview for sold bike
document.getElementById('soldImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('soldImagePreview').src = ev.target.result;
            document.getElementById('soldImagePreview').classList.remove('hidden');
            document.getElementById('soldImageUrl').value = '';
        };
        reader.readAsDataURL(file);
    }
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
        
        if (filter === 'all') bikes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (filter === 'price-desc') bikes.sort((a, b) => b.price_num - a.price_num);
        else if (filter === 'price-asc') bikes.sort((a, b) => a.price_num - b.price_num);
        renderBikes();
    }
});

// Logo handlers
document.getElementById('clickableLogo')?.addEventListener('click', () => {
    if (token) {
        document.getElementById('logoPreview').src = document.getElementById('siteLogo').src;
        document.getElementById('logoUrlInput').value = document.getElementById('siteLogo').src;
        document.getElementById('editLogoModal').classList.remove('hidden');
    } else {
        showToast('Please login as admin to change logo', true);
        document.getElementById('loginModal').classList.remove('hidden');
    }
});

document.getElementById('saveLogoBtn')?.addEventListener('click', async () => {
    const logoUrl = document.getElementById('logoUrlInput').value;
    const logoFile = document.getElementById('logoUploadInput').files[0];
    const formData = new FormData();
    if (logoUrl) formData.append('logoUrl', logoUrl);
    if (logoFile) formData.append('logo', logoFile);
    
    const response = await apiCall('/api/settings/logo', { method: 'POST', body: formData });
    if (response && response.ok) {
        const data = await response.json();
        document.getElementById('siteLogo').src = data.logoUrl;
        showToast('Logo updated successfully!');
        closeAllModals();
        loadLogo();
    }
});

document.getElementById('logoUploadInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('logoPreview').src = ev.target.result;
            document.getElementById('logoUrlInput').value = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

async function loadLogo() {
    const response = await apiCall('/api/settings/logo');
    if (response && response.ok) {
        const data = await response.json();
        if (data.logoUrl) {
            document.getElementById('siteLogo').src = data.logoUrl;
        }
    }
}

// ============= INITIALIZE =============
async function init() {
    console.log('🚀 Starting app...');
    
    loadComments();
    loadFeedbacks();
    
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
        token = savedToken;
        await checkAuth();
    }
    
    await loadLogo();
    await loadSocialLinks();
    window.navigateTo('home');
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `@keyframes fadeInOut { 0% { opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; } } .toast { animation: fadeInOut 3s ease; }`;
document.head.appendChild(style);

init();
