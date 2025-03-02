// Rides Module
const ridesModule = (() => {
    // Rides data
    let rides = [];
    let filteredRides = [];
    let currentFilter = 'all';
    let searchQuery = '';
    
    // DOM Elements
    const ridesContainer = document.getElementById('rides-container');
    const routeSearch = document.getElementById('route-search');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const createRideForm = document.getElementById('create-ride-form');
    const rideTypeSelect = document.getElementById('ride-type');
    const driverInfoSection = document.getElementById('driver-info-section');
    const createMessage = document.getElementById('create-message');
    const modal = document.getElementById('ride-details-modal');
    const modalContent = document.querySelector('.modal-content');
    const modalDetails = document.getElementById('modal-ride-details');
    const closeModal = document.querySelector('.close-modal');
    const joinRideBtn = document.getElementById('join-ride-btn');
    const leaveRideBtn = document.getElementById('leave-ride-btn');
    const chatWithDriverBtn = document.getElementById('chat-with-driver-btn');
    
    // Current selected ride
    let selectedRide = null;
    
    // Initialize module
    function init() {
        // Set up event listeners
        routeSearch.addEventListener('input', handleSearch);
        
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentFilter = button.dataset.filter;
                applyFilters();
            });
        });
        
        rideTypeSelect.addEventListener('change', toggleDriverInfoSection);
        
        createRideForm.addEventListener('submit', handleCreateRide);
        
        closeModal.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        joinRideBtn.addEventListener('click', handleJoinRide);
        leaveRideBtn.addEventListener('click', handleLeaveRide);
        chatWithDriverBtn.addEventListener('click', handleChatWithDriver);
        
        // Set default date-time to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        document.getElementById('date-time').valueAsDate = tomorrow;
        
        // Initial load
        loadRides();
        toggleDriverInfoSection();
    }
    
    // Load rides from Firestore
    async function loadRides() {
        try {
            // Get rides from Google Sheets via Firestore
            const snapshot = await db.collection('rides').where('dateTime', '>', new Date()).get();
            
            rides = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    driverId: data.driverId,
                    driverName: data.driverName,
                    departurePoint: data.departurePoint,
                    arrivalPoint: data.arrivalPoint,
                    price: data.price,
                    dateTime: data.dateTime.toDate(),
                    availableSeats: data.availableSeats,
                    createdAt: data.createdAt.toDate(),
                    rideType: data.rideType,
                    passengers: data.passengers || [],
                    totalSeats: data.totalSeats || data.availableSeats
                };
            });
            
            // Apply filters and render
            applyFilters();
        } catch (error) {
            console.error('Error loading rides:', error);
        }
    }
    
    // Handle search input
    function handleSearch() {
        searchQuery = routeSearch.value.toLowerCase();
        applyFilters();
    }
    
    // Apply filters and search
    function applyFilters() {
        filteredRides = rides.filter(ride => {
            // Filter by search query
            const matchesSearch = searchQuery === '' || 
                ride.departurePoint.toLowerCase().includes(searchQuery) || 
                ride.arrivalPoint.toLowerCase().includes(searchQuery);
            
            // Filter by filter type
            let matchesFilter = true;
            switch (currentFilter) {
                case 'available':
                    matchesFilter = ride.availableSeats > 0;
                    break;
                case 'carpool':
                    matchesFilter = ride.rideType === 'Carpool';
                    break;
                case 'taxi':
                    matchesFilter = ride.rideType === 'Taxi';
                    break;
            }
            
            return matchesSearch && matchesFilter;
        });
        
        // Sort by date
        filteredRides.sort((a, b) => a.dateTime - b.dateTime);
        
        // Render rides
        renderRides();
    }
    
    // Render rides
    function renderRides() {
        ridesContainer.innerHTML = '';
        
        if (filteredRides.length === 0) {
            ridesContainer.innerHTML = '<p class="no-rides">No rides found. Try adjusting your filters.</p>';
            return;
        }
        
        // Group rides by date
        const groupedRides = {};
        filteredRides.forEach(ride => {
            const dateKey = formatDate(ride.dateTime);
            if (!groupedRides[dateKey]) {
                groupedRides[dateKey] = [];
            }
            groupedRides[dateKey].push(ride);
        });
        
        // Render grouped rides
        Object.keys(groupedRides).sort().forEach(dateKey => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            const dateHeader = document.createElement('h3');
            dateHeader.className = 'date-header';
            dateHeader.textContent = dateKey;
            dateGroup.appendChild(dateHeader);
            
            const ridesList = document.createElement('div');
            ridesList.className = 'rides-list';
            
            groupedRides[dateKey].forEach(ride => {
                const rideCard = createRideCard(ride);
                ridesList.appendChild(rideCard);
            });
            
            dateGroup.appendChild(ridesList);
            ridesContainer.appendChild(dateGroup);
        });
    }
    
    // Create ride card
    function createRideCard(ride) {
        const template = document.getElementById('ride-card-template');
        const rideCard = document.importNode(template.content, true).querySelector('.ride-card');
        
        // Set ride data
        rideCard.querySelector('.ride-type').textContent = ride.rideType;
        rideCard.querySelector('.ride-price').textContent = formatCurrency(ride.price);
        rideCard.querySelector('.departure-text').textContent = ride.departurePoint;
        rideCard.querySelector('.arrival-text').textContent = ride.arrivalPoint;
        rideCard.querySelector('.time-text').textContent = formatTime(ride.dateTime);
        rideCard.querySelector('.driver-name').textContent = ride.driverName;
        
        const occupiedSeats = ride.totalSeats - ride.availableSeats;
        rideCard.querySelector('.seats-text').textContent = `${occupiedSeats}/${ride.totalSeats}`;
        
        // Add event listener to view details button
        rideCard.querySelector('.view-details-btn').addEventListener('click', () => {
            showRideDetails(ride);
        });
        
        return rideCard;
    }
    
    // Show ride details in modal
    function showRideDetails(ride) {
        selectedRide = ride;
        
        // Create details HTML
        const detailsHTML = `
            <div class="ride-detail-header">
                <div class="ride-type-badge ${ride.rideType.toLowerCase()}">${ride.rideType}</div>
                <div class="ride-price-large">${formatCurrency(ride.price)}</div>
            </div>
            <div class="ride-route-details">
                <div class="route-point">
                    <div class="point-label">From:</div>
                    <div class="point-value">${ride.departurePoint}</div>
                </div>
                <div class="route-point">
                    <div class="point-label">To:</div>
                    <div class="point-value">${ride.arrivalPoint}</div>
                </div>
            </div>
            <div class="ride-info-grid">
                <div class="info-item">
                    <div class="info-label">Date:</div>
                    <div class="info-value">${formatDate(ride.dateTime)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Time:</div>
                    <div class="info-value">${formatTime(ride.dateTime)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Driver:</div>
                    <div class="info-value">${ride.driverName}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Available Seats:</div>
                    <div class="info-value">${ride.availableSeats} of ${ride.totalSeats}</div>
                </div>
            </div>
            <div class="passengers-section">
                <h4>Passengers:</h4>
                <ul class="passengers-list">
                    ${ride.passengers.length > 0 
                        ? ride.passengers.map(passenger => `<li>${passenger}</li>`).join('') 
                        : '<li class="no-passengers">No passengers yet</li>'}
                </ul>
            </div>
        `;
        
        modalDetails.innerHTML = detailsHTML;
        
        // Check if current user is already a passenger
        const currentUser = authModule.getCurrentUser();
        const isPassenger = ride.passengers.includes(currentUser.name);
        const isDriver = ride.driverId === currentUser.id;
        
        // Update buttons
        if (isDriver) {
            joinRideBtn.style.display = 'none';
            leaveRideBtn.style.display = 'none';
            chatWithDriverBtn.textContent = 'View Ride Chat';
        } else if (isPassenger) {
            joinRideBtn.style.display = 'none';
            leaveRideBtn.style.display = 'inline-block';
            chatWithDriverBtn.textContent = 'Chat with Driver';
        } else {
            joinRideBtn.style.display = ride.availableSeats > 0 ? 'inline-block' : 'none';
            leaveRideBtn.style.display = 'none';
            chatWithDriverBtn.textContent = 'Chat with Driver';
        }
        
        // Show modal
        modal.classList.add('active');
    }
    
    // Handle join ride
    async function handleJoinRide() {
        if (!selectedRide) return;
        
        try {
            const currentUser = authModule.getCurrentUser();
            
            // Update ride in Firestore
            const rideRef = db.collection('rides').doc(selectedRide.id);
            
            await db.runTransaction(async (transaction) => {
                const rideDoc = await transaction.get(rideRef);
                if (!rideDoc.exists) {
                    throw new Error('Ride does not exist!');
                }
                
                const rideData = rideDoc.data();
                
                // Check if there are available seats
                if (rideData.availableSeats <= 0) {
                    throw new Error('No available seats!');
                }
                
                // Check if user is already a passenger
                const passengers = rideData.passengers || [];
                if (passengers.includes(currentUser.name)) {
                    throw new Error('You are already a passenger!');
                }
                
                // Add user to passengers and update available seats
                passengers.push(currentUser.name);
                
                transaction.update(rideRef, {
                    passengers: passengers,
                    availableSeats: rideData.availableSeats - 1
                });
                
                // Also update the ride chat if it exists
                if (rideData.chatId) {
                    const chatRef = db.collection('chats').doc(rideData.chatId);
                    const chatDoc = await transaction.get(chatRef);
                    
                    if (chatDoc.exists) {
                        const chatData = chatDoc.data();
                        const chatParticipants = chatData.participants || [];
                        
                        if (!chatParticipants.includes(currentUser.id)) {
                            chatParticipants.push(currentUser.id);
                            
                            transaction.update(chatRef, {
                                participants: chatParticipants
                            });
                            
                            // Add system message
                            const messageRef = db.collection('messages').doc();
                            transaction.set(messageRef, {
                                chatId: rideData.chatId,
                                senderId: 'system',
                                senderName: 'System',
                                content: `${currentUser.name} has joined the ride.`,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                isSystemMessage: true
                            });
                        }
                    }
                }
            });
            
            // Update local data
            selectedRide.passengers.push(currentUser.name);
            selectedRide.availableSeats -= 1;
            
            // Refresh rides
            loadRides();
            
            // Update modal
            showRideDetails(selectedRide);
        } catch (error) {
            console.error('Error joining ride:', error);
            alert(error.message);
        }
    }
    
    // Handle leave ride
    async function handleLeaveRide() {
        if (!selectedRide) return;
        
        try {
            const currentUser = authModule.getCurrentUser();
            
            // Update ride in Firestore
            const rideRef = db.collection('rides').doc(selectedRide.id);
            
            await db.runTransaction(async (transaction) => {
                const rideDoc = await transaction.get(rideRef);
                if (!rideDoc.exists) {
                    throw new Error('Ride does not exist!');
                }
                
                const rideData = rideDoc.data();
                
                // Check if user is a passenger
                const passengers = rideData.passengers || [];
                const passengerIndex = passengers.indexOf(currentUser.name);
                
                if (passengerIndex === -1) {
                    throw new Error('You are not a passenger!');
                }
                
                // Remove user from passengers and update available seats
                passengers.splice(passengerIndex, 1);
                
                transaction.update(rideRef, {
                    passengers: passengers,
                    availableSeats: rideData.availableSeats + 1
                });
                
                // Add system message to chat
                if (rideData.chatId) {
                    const messageRef = db.collection('messages').doc();
                    transaction.set(messageRef, {
                        chatId: rideData.chatId,
                        senderId: 'system',
                        senderName: 'System',
                        content: `${currentUser.name} has left the ride.`,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        isSystemMessage: true
                    });
                }
            });
            
            // Update local data
            const passengerIndex = selectedRide.passengers.indexOf(currentUser.name);
            if (passengerIndex !== -1) {
                selectedRide.passengers.splice(passengerIndex, 1);
                selectedRide.availableSeats += 1;
            }
            
            // Refresh rides
            loadRides();
            
            // Update modal
            showRideDetails(selectedRide);
        } catch (error) {
            console.error('Error leaving ride:', error);
            alert(error.message);
        }
    }
    
    // Handle chat with driver
    function handleChatWithDriver() {
        if (!selectedRide) return;
        
        // Close modal
        modal.classList.remove('active');
        
        // Switch to messages tab
        document.getElementById('messages-tab').click();
        
        // Open chat with driver or ride chat
        messagesModule.openChatWithDriver(selectedRide);
    }
    
    // Toggle driver info section based on ride type
    function toggleDriverInfoSection() {
        const rideType = rideTypeSelect.value;
        
        if (rideType === 'Carpool') {
            driverInfoSection.style.display = 'block';
        } else {
            driverInfoSection.style.display = 'none';
        }
    }
    
    // Handle create ride form submission
    async function handleCreateRide(e) {
        e.preventDefault();
        
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        const departurePoint = document.getElementById('departure').value;
        const arrivalPoint = document.getElementById('arrival').value;
        const rideType = document.getElementById('ride-type').value;
        const price = parseFloat(document.getElementById('price').value);
        const dateTime = new Date(document.getElementById('date-time').value);
        const availableSeats = parseInt(document.getElementById('seats').value);
        
        // Validate form
        if (departurePoint === arrivalPoint) {
            showError('create-message', 'Departure and arrival points cannot be the same.');
            return;
        }
        
        if (dateTime <= new Date()) {
            showError('create-message', 'Date and time must be in the future.');
            return;
        }
        
        if (availableSeats <= 0) {
            showError('create-message', 'Available seats must be greater than 0.');
            return;
        }
        
        // For carpool rides, check if user is a driver with car details
        if (rideType === 'Carpool') {
            if (!currentUser.isDriver) {
                showError('create-message', 'You must be registered as a driver to create carpool rides.');
                return;
            }
            
            if (!currentUser.carPlateNumber || !currentUser.carModel || !currentUser.carColor) {
                showError('create-message', 'Please complete your driver information in the profile tab.');
                return;
            }
        }
        
        try {
            createMessage.textContent = 'Creating ride...';
            
            // Create ride in Firestore
            const rideId = generateId();
            const rideData = {
                id: rideId,
                driverId: currentUser.id,
                driverName: currentUser.name,
                departurePoint: departurePoint,
                arrivalPoint: arrivalPoint,
                price: price,
                dateTime: firebase.firestore.Timestamp.fromDate(dateTime),
                availableSeats: availableSeats,
                createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
                rideType: rideType,
                passengers: [],
                totalSeats: availableSeats
            };
            
            // Add ride to Firestore
            await db.collection('rides').doc(rideId).set(rideData);
            
            // Create a ride chat group
            const chatId = await createRideGroupChat(rideData);
            
            // Update ride with chat ID
            await db.collection('rides').doc(rideId).update({
                chatId: chatId
            });
            
            // Show success message
            showSuccess('create-message', 'Ride created successfully!');
            
            // Reset form
            createRideForm.reset();
            
            // Set default date-time to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(12, 0, 0, 0);
            document.getElementById('date-time').valueAsDate = tomorrow;
            
            // Refresh rides
            loadRides();
        } catch (error) {
            console.error('Error creating ride:', error);
            showError('create-message', 'Error creating ride. Please try again.');
        }
    }
    
    // Create ride group chat
    async function createRideGroupChat(ride) {
        try {
            const currentUser = authModule.getCurrentUser();
            
            // Create chat document
            const chatRef = db.collection('chats').doc();
            const chatId = chatRef.id;
            
            const chatData = {
                id: chatId,
                participants: [currentUser.id],
                lastMessage: `Ride from ${ride.departurePoint} to ${ride.arrivalPoint} created.`,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSenderId: 'system',
                isRideChat: true,
                rideId: ride.id,
                chatName: `${ride.departurePoint} → ${ride.arrivalPoint}`,
                rideDetails: {
                    departurePoint: ride.departurePoint,
                    arrivalPoint: ride.arrivalPoint,
                    dateTime: firebase.firestore.Timestamp.fromDate(ride.dateTime),
                    driverId: ride.driverId,
                    driverName: ride.driverName,
                    totalSeats: ride.totalSeats,
                    remainingSeats: ride.availableSeats
                }
            };
            
            await chatRef.set(chatData);
            
            // Create initial system message
            await db.collection('messages').add({
                chatId: chatId,
                senderId: 'system',
                senderName: 'System',
                content: `Ride from ${ride.departurePoint} to ${ride.arrivalPoint} created by ${currentUser.name}.`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isSystemMessage: true
            });
            
            return chatId;
        } catch (error) {
            console.error('Error creating ride chat:', error);
            throw error;
        }
    }
    
    // Public API
    return {
        init,
        loadRides
    };
})(); 