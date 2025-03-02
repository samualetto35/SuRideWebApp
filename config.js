// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDtdZ0lB9KDapUsSHcyQSvNrxZVWyeur4k",
    authDomain: "surideapplication-123.firebaseapp.com",
    projectId: "surideapplication-123",
    storageBucket: "surideapplication-123.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Initialize Auth
const auth = firebase.auth();

// Location data
const locations = {
    "Sabancı University": { lat: 40.8917, lng: 29.3792 },
    "Kadıköy": { lat: 40.9906, lng: 29.0233 },
    "Taksim": { lat: 41.0367, lng: 28.9850 },
    "Üsküdar": { lat: 41.0275, lng: 29.0156 },
    "Maltepe": { lat: 40.9321, lng: 29.1369 },
    "Pendik": { lat: 40.8781, lng: 29.2539 }
};

// Helper functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
}

function formatCurrency(amount) {
    return `${amount} TL`;
}

// Show error message
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.remove('success');
}

// Show success message
function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('success');
}

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (hours > 0) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (minutes > 0) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
        return 'Just now';
    }
} 