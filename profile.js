// Profile Module
const profileModule = (() => {
    // DOM Elements
    const profileForm = document.getElementById('profile-form');
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const phoneInput = document.getElementById('profile-phone');
    const bioInput = document.getElementById('profile-bio');
    const profileImage = document.getElementById('profile-image');
    const imageUpload = document.getElementById('image-upload');
    const saveButton = document.getElementById('save-profile');
    const profileError = document.getElementById('profile-error');
    const profileSuccess = document.getElementById('profile-success');
    
    // Initialize module
    function init() {
        // Set up event listeners
        profileForm.addEventListener('submit', handleProfileUpdate);
        imageUpload.addEventListener('change', handleImageUpload);
        
        // Load user profile
        loadUserProfile();
    }
    
    // Load user profile
    async function loadUserProfile() {
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        try {
            // Get user document from Firestore
            const userDoc = await db.collection('users').doc(currentUser.id).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Populate form fields
                nameInput.value = userData.name || '';
                emailInput.value = userData.email || '';
                phoneInput.value = userData.phone || '';
                bioInput.value = userData.bio || '';
                
                // Set profile image if exists
                if (userData.profileImageUrl) {
                    profileImage.src = userData.profileImageUrl;
                    profileImage.style.display = 'block';
                } else {
                    profileImage.src = 'img/default-profile.png';
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            showError('Failed to load profile. Please try again.');
        }
    }
    
    // Handle profile update
    async function handleProfileUpdate(e) {
        e.preventDefault();
        
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        // Clear previous messages
        clearMessages();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        try {
            // Prepare user data
            const userData = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                phone: phoneInput.value.trim(),
                bio: bioInput.value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Update user document in Firestore
            await db.collection('users').doc(currentUser.id).update(userData);
            
            // Update local user data
            currentUser.name = userData.name;
            currentUser.email = userData.email;
            
            // Update UI
            authModule.updateUserUI();
            
            // Show success message
            showSuccess('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            showError('Failed to update profile. Please try again.');
        }
    }
    
    // Handle image upload
    async function handleImageUpload(e) {
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        const file = e.target.files[0];
        if (!file) return;
        
        // Clear previous messages
        clearMessages();
        
        // Validate file type
        if (!file.type.match('image.*')) {
            showError('Please select an image file.');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError('Image size should be less than 5MB.');
            return;
        }
        
        try {
            // Show loading state
            saveButton.disabled = true;
            saveButton.textContent = 'Uploading...';
            
            // Create storage reference
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`profile_images/${currentUser.id}/${file.name}`);
            
            // Upload file
            const snapshot = await fileRef.put(file);
            
            // Get download URL
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            // Update user document with profile image URL
            await db.collection('users').doc(currentUser.id).update({
                profileImageUrl: downloadURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update UI
            profileImage.src = downloadURL;
            profileImage.style.display = 'block';
            
            // Show success message
            showSuccess('Profile image updated successfully!');
        } catch (error) {
            console.error('Error uploading image:', error);
            showError('Failed to upload image. Please try again.');
        } finally {
            // Reset button state
            saveButton.disabled = false;
            saveButton.textContent = 'Save Profile';
        }
    }
    
    // Validate form
    function validateForm() {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        
        if (!name) {
            showError('Name is required.');
            nameInput.focus();
            return false;
        }
        
        if (!email) {
            showError('Email is required.');
            emailInput.focus();
            return false;
        }
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address.');
            emailInput.focus();
            return false;
        }
        
        return true;
    }
    
    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Show error message
    function showError(message) {
        profileError.textContent = message;
        profileError.style.display = 'block';
        profileSuccess.style.display = 'none';
    }
    
    // Show success message
    function showSuccess(message) {
        profileSuccess.textContent = message;
        profileSuccess.style.display = 'block';
        profileError.style.display = 'none';
    }
    
    // Clear messages
    function clearMessages() {
        profileError.style.display = 'none';
        profileSuccess.style.display = 'none';
    }
    
    // Get user profile data
    async function getUserProfile(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                return userDoc.data();
            }
            
            return null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }
    
    // Public API
    return {
        init,
        getUserProfile
    };
})(); 