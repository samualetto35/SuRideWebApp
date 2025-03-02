// Main App Module
const app = (() => {
    // DOM Elements
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Initialize app
    function init() {
        // Set up event listeners
        setupTabNavigation();
        
        // Initialize modules
        authModule.init();
        
        // Check authentication state
        authModule.onAuthStateChanged(user => {
            if (user) {
                // User is signed in
                initializeAuthenticatedModules();
                showTab('rides'); // Default tab for authenticated users
            } else {
                // User is signed out
                showTab('login'); // Show login tab for unauthenticated users
            }
            
            // Hide loading indicator
            hideLoading();
        });
        
        // Handle initial route
        handleInitialRoute();
    }
    
    // Initialize modules that require authentication
    function initializeAuthenticatedModules() {
        ridesModule.init();
        messagesModule.init();
        profileModule.init();
    }
    
    // Set up tab navigation
    function setupTabNavigation() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                showTab(tabId);
            });
        });
    }
    
    // Show specific tab
    function showTab(tabId) {
        // Update URL
        setQueryParam('tab', tabId);
        
        // Update active tab
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show active tab content
        tabContents.forEach(content => {
            if (content.getAttribute('id') === tabId) {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        });
        
        // Handle special tab actions
        handleTabSpecificActions(tabId);
    }
    
    // Handle tab-specific actions
    function handleTabSpecificActions(tabId) {
        switch (tabId) {
            case 'rides':
                // Refresh rides when tab is shown
                if (ridesModule && typeof ridesModule.refreshRides === 'function') {
                    ridesModule.refreshRides();
                }
                break;
            case 'messages':
                // Update unread counts when messages tab is shown
                if (messagesModule && typeof messagesModule.updateUnreadCounts === 'function') {
                    messagesModule.updateUnreadCounts();
                }
                break;
            case 'profile':
                // Refresh profile when tab is shown
                if (profileModule && typeof profileModule.loadUserProfile === 'function') {
                    profileModule.loadUserProfile();
                }
                break;
        }
    }
    
    // Handle initial route from URL
    function handleInitialRoute() {
        const tabParam = getQueryParam('tab');
        const rideId = getQueryParam('ride');
        
        if (tabParam) {
            // Check if tab exists
            const tabExists = Array.from(tabs).some(tab => tab.getAttribute('data-tab') === tabParam);
            
            if (tabExists) {
                showTab(tabParam);
            }
        }
        
        // Handle ride detail view if ride ID is in URL
        if (rideId && ridesModule && typeof ridesModule.showRideDetails === 'function') {
            ridesModule.showRideDetails(rideId);
        }
    }
    
    // Show loading indicator
    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
    }
    
    // Hide loading indicator
    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
    
    // Navigate to a specific tab
    function navigateTo(tabId, params = {}) {
        // Set URL parameters
        Object.entries(params).forEach(([key, value]) => {
            setQueryParam(key, value);
        });
        
        // Show tab
        showTab(tabId);
    }
    
    // Public API
    return {
        init,
        showTab,
        navigateTo,
        showLoading,
        hideLoading
    };
})();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
}); 