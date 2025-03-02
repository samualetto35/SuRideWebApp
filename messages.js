// Messages Module
const messagesModule = (() => {
    // Chats and messages data
    let chats = [];
    let currentChat = null;
    let messagesListener = null;
    
    // DOM Elements
    const chatsList = document.getElementById('chats-list');
    const messagesList = document.getElementById('messages-list');
    const chatHeader = document.getElementById('chat-header');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const unreadBadge = document.getElementById('unread-badge');
    
    // Initialize module
    function init() {
        // Set up event listeners
        messageForm.addEventListener('submit', handleSendMessage);
        
        // Load chats
        loadChats();
    }
    
    // Load chats from Firestore
    function loadChats() {
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        // Unsubscribe from previous listener if exists
        if (window.chatsListener) {
            window.chatsListener();
        }
        
        // Listen for chats where the current user is a participant
        window.chatsListener = db.collection('chats')
            .where('participants', 'array-contains', currentUser.id)
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot(snapshot => {
                chats = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        participants: data.participants,
                        lastMessage: data.lastMessage,
                        lastMessageTime: data.lastMessageTime ? data.lastMessageTime.toDate() : new Date(),
                        lastMessageSenderId: data.lastMessageSenderId,
                        isRideChat: data.isRideChat,
                        rideId: data.rideId,
                        chatName: data.chatName,
                        rideDetails: data.rideDetails,
                        unreadCount: 0 // Will be updated later
                    };
                });
                
                // Get unread counts for each chat
                updateUnreadCounts();
                
                // Render chats
                renderChats();
                
                // Update unread badge
                updateUnreadBadge();
            });
    }
    
    // Update unread counts for each chat
    async function updateUnreadCounts() {
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        try {
            // Get last read timestamps for each chat
            const lastReadDoc = await db.collection('users').doc(currentUser.id).collection('lastRead').get();
            const lastReadMap = {};
            
            lastReadDoc.docs.forEach(doc => {
                lastReadMap[doc.id] = doc.data().timestamp;
            });
            
            // For each chat, count unread messages
            for (const chat of chats) {
                const lastRead = lastReadMap[chat.id] ? lastReadMap[chat.id].toDate() : new Date(0);
                
                // Get messages after last read
                const unreadSnapshot = await db.collection('messages')
                    .where('chatId', '==', chat.id)
                    .where('timestamp', '>', lastRead)
                    .where('senderId', '!=', currentUser.id)
                    .get();
                
                chat.unreadCount = unreadSnapshot.size;
            }
            
            // Render chats with updated unread counts
            renderChats();
            
            // Update unread badge
            updateUnreadBadge();
        } catch (error) {
            console.error('Error updating unread counts:', error);
        }
    }
    
    // Update unread badge in the tab
    function updateUnreadBadge() {
        const totalUnread = chats.reduce((total, chat) => total + chat.unreadCount, 0);
        
        if (totalUnread > 0) {
            unreadBadge.textContent = totalUnread;
            unreadBadge.style.display = 'inline-block';
        } else {
            unreadBadge.style.display = 'none';
        }
    }
    
    // Render chats list
    function renderChats() {
        chatsList.innerHTML = '';
        
        if (chats.length === 0) {
            chatsList.innerHTML = '<p class="no-chats">No conversations yet</p>';
            return;
        }
        
        chats.forEach(chat => {
            const chatItem = createChatItem(chat);
            chatsList.appendChild(chatItem);
        });
    }
    
    // Create chat item
    function createChatItem(chat) {
        const template = document.getElementById('chat-item-template');
        const chatItem = document.importNode(template.content, true).querySelector('.chat-item');
        
        // Set chat data
        const chatName = getChatName(chat);
        chatItem.querySelector('.chat-name').textContent = chatName;
        chatItem.querySelector('.last-message').textContent = chat.lastMessage;
        
        // Format time
        const timeText = chat.lastMessageTime ? formatRelativeTime(chat.lastMessageTime) : '';
        chatItem.querySelector('.chat-time').textContent = timeText;
        
        // Show unread count if any
        const unreadCountElement = chatItem.querySelector('.unread-count');
        if (chat.unreadCount > 0) {
            unreadCountElement.textContent = chat.unreadCount;
            unreadCountElement.style.display = 'inline-block';
        } else {
            unreadCountElement.style.display = 'none';
        }
        
        // Highlight if current chat
        if (currentChat && chat.id === currentChat.id) {
            chatItem.classList.add('active');
        }
        
        // Add click event
        chatItem.addEventListener('click', () => {
            openChat(chat);
        });
        
        return chatItem;
    }
    
    // Get chat name based on participants or ride details
    function getChatName(chat) {
        if (chat.chatName) {
            return chat.chatName;
        }
        
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return 'Chat';
        
        // For direct chats, show the other participant's name
        if (chat.participants.length === 2) {
            const otherParticipantId = chat.participants.find(id => id !== currentUser.id);
            
            // Find the other participant in the chat
            return getParticipantName(otherParticipantId) || 'Chat';
        }
        
        // For group chats without a name, show number of participants
        return `Group (${chat.participants.length})`;
    }
    
    // Get participant name from ID
    async function getParticipantName(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                return userDoc.data().name;
            }
            return 'Unknown User';
        } catch (error) {
            console.error('Error getting participant name:', error);
            return 'Unknown User';
        }
    }
    
    // Open chat
    function openChat(chat) {
        currentChat = chat;
        
        // Update UI
        renderChats(); // Re-render to highlight current chat
        
        // Update chat header
        updateChatHeader(chat);
        
        // Show message form
        messageForm.style.display = 'flex';
        
        // Clear message input
        messageInput.value = '';
        
        // Load messages
        loadMessages(chat.id);
        
        // Mark chat as read
        markChatAsRead(chat.id);
    }
    
    // Update chat header
    async function updateChatHeader(chat) {
        let headerText = '';
        
        if (chat.isRideChat) {
            headerText = `<h3>${chat.chatName || 'Ride Chat'}</h3>`;
            
            if (chat.rideDetails) {
                const dateTime = chat.rideDetails.dateTime ? formatDateTime(chat.rideDetails.dateTime.toDate()) : '';
                headerText += `
                    <div class="chat-ride-details">
                        <p><strong>Driver:</strong> ${chat.rideDetails.driverName}</p>
                        <p><strong>Date:</strong> ${dateTime}</p>
                        <p><strong>Seats:</strong> ${chat.rideDetails.remainingSeats} of ${chat.rideDetails.totalSeats} available</p>
                    </div>
                `;
            }
        } else {
            // For direct chats, get the other participant's name
            const currentUser = authModule.getCurrentUser();
            if (chat.participants.length === 2) {
                const otherParticipantId = chat.participants.find(id => id !== currentUser.id);
                const name = await getParticipantName(otherParticipantId);
                headerText = `<h3>${name}</h3>`;
            } else {
                headerText = `<h3>${chat.chatName || 'Group Chat'}</h3>`;
            }
        }
        
        chatHeader.innerHTML = headerText;
    }
    
    // Load messages for a chat
    function loadMessages(chatId) {
        // Clear messages list
        messagesList.innerHTML = '';
        
        // Unsubscribe from previous listener if exists
        if (messagesListener) {
            messagesListener();
        }
        
        // Listen for messages in this chat
        messagesListener = db.collection('messages')
            .where('chatId', '==', chatId)
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                // Clear messages list if it's a new set of messages
                if (snapshot.metadata.hasPendingWrites === false) {
                    messagesList.innerHTML = '';
                }
                
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const message = {
                        id: doc.id,
                        chatId: data.chatId,
                        senderId: data.senderId,
                        senderName: data.senderName,
                        content: data.content,
                        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
                        isSystemMessage: data.isSystemMessage
                    };
                    
                    // Add message to UI
                    addMessageToUI(message);
                });
                
                // Scroll to bottom
                messagesList.scrollTop = messagesList.scrollHeight;
                
                // Mark chat as read
                markChatAsRead(chatId);
            });
    }
    
    // Add message to UI
    function addMessageToUI(message) {
        const template = document.getElementById('message-template');
        const messageElement = document.importNode(template.content, true).querySelector('.message');
        
        // Set message data
        messageElement.querySelector('.sender-name').textContent = message.senderName;
        messageElement.querySelector('.message-time').textContent = formatTime(message.timestamp);
        messageElement.querySelector('.message-content').textContent = message.content;
        
        // Add appropriate class based on sender
        const currentUser = authModule.getCurrentUser();
        
        if (message.isSystemMessage) {
            messageElement.classList.add('system');
        } else if (message.senderId === currentUser.id) {
            messageElement.classList.add('outgoing');
        } else {
            messageElement.classList.add('incoming');
        }
        
        // Add to messages list
        messagesList.appendChild(messageElement);
    }
    
    // Handle send message
    async function handleSendMessage(e) {
        e.preventDefault();
        
        if (!currentChat) return;
        
        const content = messageInput.value.trim();
        if (!content) return;
        
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        try {
            // Create message
            const messageData = {
                chatId: currentChat.id,
                senderId: currentUser.id,
                senderName: currentUser.name,
                content: content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                isSystemMessage: false
            };
            
            // Add message to Firestore
            await db.collection('messages').add(messageData);
            
            // Update chat's last message
            await db.collection('chats').doc(currentChat.id).update({
                lastMessage: content,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageSenderId: currentUser.id
            });
            
            // Clear input
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
    
    // Mark chat as read
    async function markChatAsRead(chatId) {
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        try {
            // Update last read timestamp
            await db.collection('users').doc(currentUser.id).collection('lastRead').doc(chatId).set({
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local data
            const chat = chats.find(c => c.id === chatId);
            if (chat) {
                chat.unreadCount = 0;
            }
            
            // Update UI
            renderChats();
            updateUnreadBadge();
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    }
    
    // Open chat with driver or ride chat
    async function openChatWithDriver(ride) {
        const currentUser = authModule.getCurrentUser();
        if (!currentUser) return;
        
        try {
            // If user is the driver, open the ride chat
            if (ride.driverId === currentUser.id) {
                // Find the ride chat
                const chatSnapshot = await db.collection('chats')
                    .where('rideId', '==', ride.id)
                    .limit(1)
                    .get();
                
                if (!chatSnapshot.empty) {
                    const chatData = chatSnapshot.docs[0].data();
                    const chat = {
                        id: chatSnapshot.docs[0].id,
                        participants: chatData.participants,
                        lastMessage: chatData.lastMessage,
                        lastMessageTime: chatData.lastMessageTime ? chatData.lastMessageTime.toDate() : new Date(),
                        lastMessageSenderId: chatData.lastMessageSenderId,
                        isRideChat: chatData.isRideChat,
                        rideId: chatData.rideId,
                        chatName: chatData.chatName,
                        rideDetails: chatData.rideDetails,
                        unreadCount: 0
                    };
                    
                    openChat(chat);
                    return;
                }
            }
            
            // Otherwise, check if there's an existing direct chat with the driver
            const chatsSnapshot = await db.collection('chats')
                .where('participants', 'array-contains', currentUser.id)
                .get();
            
            let existingChat = null;
            
            chatsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.participants.length === 2 && 
                    data.participants.includes(ride.driverId) && 
                    !data.isRideChat) {
                    existingChat = {
                        id: doc.id,
                        participants: data.participants,
                        lastMessage: data.lastMessage,
                        lastMessageTime: data.lastMessageTime ? data.lastMessageTime.toDate() : new Date(),
                        lastMessageSenderId: data.lastMessageSenderId,
                        isRideChat: false,
                        unreadCount: 0
                    };
                }
            });
            
            if (existingChat) {
                // Open existing chat
                openChat(existingChat);
            } else {
                // Create new chat with driver
                const chatRef = db.collection('chats').doc();
                const chatId = chatRef.id;
                
                const chatData = {
                    id: chatId,
                    participants: [currentUser.id, ride.driverId],
                    lastMessage: 'Chat started',
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessageSenderId: 'system',
                    isRideChat: false
                };
                
                await chatRef.set(chatData);
                
                // Add initial system message
                await db.collection('messages').add({
                    chatId: chatId,
                    senderId: 'system',
                    senderName: 'System',
                    content: 'Chat started',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    isSystemMessage: true
                });
                
                // Open the new chat
                const newChat = {
                    ...chatData,
                    lastMessageTime: new Date(),
                    unreadCount: 0
                };
                
                openChat(newChat);
            }
        } catch (error) {
            console.error('Error opening chat with driver:', error);
        }
    }
    
    // Public API
    return {
        init,
        openChatWithDriver
    };
})(); 