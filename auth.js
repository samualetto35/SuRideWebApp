// Auth Module
const authModule = (() => {
    // Current user data
    let currentUser = null;
    
    // DOM Elements
    const authContainer = document.getElementById('auth-container');
    const mainContainer = document.getElementById('main-container');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    const userNameElement = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Initialize auth state listener
    function init() {
        // Listen for auth state changes
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in
                if (user.emailVerified) {
                    try {
                        // Get user data from Firestore
                        const doc = await db.collection('users').doc(user.uid).get();
                        
                        if (doc.exists) {
                            const userData = doc.data();
                            currentUser = {
                                id: user.uid,
                                email: user.email,
                                name: userData.name || user.displayName || '',
                                phoneNumber: userData.phoneNumber || user.phoneNumber || '',
                                carPlateNumber: userData.carPlateNumber || null,
                                carModel: userData.carModel || null,
                                carColor: userData.carColor || null,
                                isDriver: userData.isDriver || false
                            };
                            
                            // Show main app
                            showMainApp();
                            
                            // Update UI with user data
                            updateUserUI();
                            
                            // Initialize other modules
                            ridesModule.init();
                            messagesModule.init();
                            profileModule.init();
                        } else {
                            // Create user document if it doesn't exist
                            const newUser = {
                                id: user.uid,
                                email: user.email,
                                name: user.displayName || '',
                                phoneNumber: user.phoneNumber || '',
                                isDriver: false
                            };
                            
                            await db.collection('users').doc(user.uid).set(newUser);
                            currentUser = newUser;
                            
                            // Show main app
                            showMainApp();
                            
                            // Update UI with user data
                            updateUserUI();
                            
                            // Initialize other modules
                            ridesModule.init();
                            messagesModule.init();
                            profileModule.init();
                        }
                    } catch (error) {
                        console.error('Error getting user data:', error);
                        showError('login-message', 'Error loading user data. Please try again.');
                    }
                } else {
                    // Email not verified
                    showError('login-message', 'Please verify your email before logging in.');
                    auth.signOut();
                }
            } else {
                // User is signed out
                currentUser = null;
                showAuthContainer();
            }
        });
        
        // Set up event listeners
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            loginMessage.textContent = '';
            registerMessage.textContent = '';
        });
        
        registerTab.addEventListener('click', () => {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.style.display = 'block';
            loginForm.style.display = 'none';
            loginMessage.textContent = '';
            registerMessage.textContent = '';
        });
        
        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Handle login form submission
    async function handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            loginMessage.textContent = 'Logging in...';
            await auth.signInWithEmailAndPassword(email, password);
            // Auth state listener will handle the rest
        } catch (error) {
            console.error('Login error:', error);
            showError('login-message', getAuthErrorMessage(error));
        }
    }
    
    // Handle register form submission
    async function handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        
        try {
            registerMessage.textContent = 'Creating account...';
            
            // Create user with email and password
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update profile with display name
            await user.updateProfile({
                displayName: name
            });
            
            // Send email verification
            await user.sendEmailVerification();
            
            // Create user document in Firestore
            await db.collection('users').doc(user.uid).set({
                id: user.uid,
                email: email,
                name: name,
                phoneNumber: phone,
                isDriver: false
            });
            
            // Show success message
            showSuccess('register-message', 'Account created! Please check your email to verify your account.');
            
            // Switch to login tab
            setTimeout(() => {
                loginTab.click();
            }, 3000);
        } catch (error) {
            console.error('Registration error:', error);
            showError('register-message', getAuthErrorMessage(error));
        }
    }
    
    // Handle logout
    async function handleLogout() {
        try {
            await auth.signOut();
            // Auth state listener will handle the rest
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Show auth container
    function showAuthContainer() {
        authContainer.style.display = 'flex';
        mainContainer.style.display = 'none';
    }
    
    // Show main app
    function showMainApp() {
        authContainer.style.display = 'none';
        mainContainer.style.display = 'block';
    }
    
    // Update UI with user data
    function updateUserUI() {
        if (currentUser) {
            userNameElement.textContent = currentUser.name;
        }
    }
    
    // Get auth error message
    function getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No user found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/email-already-in-use':
                return 'Email already in use.';
            case 'auth/weak-password':
                return 'Password is too weak.';
            default:
                return error.message;
        }
    }
    
    // Get current user
    function getCurrentUser() {
        return currentUser;
    }
    
    // Public API
    return {
        init,
        getCurrentUser
    };
})();

// Initialize auth module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    authModule.init();
}); 