// Global variables
let allListings = [];
let filteredListings = [];
let availableDates = [];
let recognition = null;
let globalRecognition = null; // For global wake word detection
let isListening = false;
let isGlobalListening = false; // For global wake word listening
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isReading = false;
let wasVoiceTriggered = false; // Track if scraping was triggered by voice

// Text-to-speech functionality
function speakListings(autoRead = false) {
    if (!speechSynthesis) {
        console.error('Text-to-speech not supported');
        return;
    }
    
    // Stop voice recognition while speaking
    if (isListening && recognition) {
        recognition.stop();
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Prepare the text to read
    let textToRead = '';
    
    // Add the header information
    const dateDisplay = document.getElementById('currentDateDisplay').textContent.replace('- ', '');
    if (dateDisplay) {
        textToRead += `TV Listings for ${dateDisplay}. `;
    }
    
    // Add count
    const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
    textToRead += `Showing ${listingsToRead.length} listings. `;
    
    // Read ALL listings when triggered by voice (not just 5)
    const maxListings = autoRead ? Math.min(listingsToRead.length, 20) : 10; // Limit to 20 for voice, 10 for button
    const readCount = Math.min(listingsToRead.length, maxListings);
    
    for (let i = 0; i < readCount; i++) {
        const listing = listingsToRead[i];
        textToRead += `At ${listing.time}, on ${listing.network}, ${listing.program}. `;
    }
    
    if (listingsToRead.length > readCount) {
        textToRead += `And ${listingsToRead.length - readCount} more listings.`;
    }
    
    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.rate = 0.9; // Slightly slower for clarity
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    
    // Handle completion
    currentUtterance.onend = function() {
        isReading = false;
        updateReadButton();
        
        // Restart listening after speech ends
        if (document.getElementById('voicePanel').style.display !== 'none') {
            setTimeout(() => {
                startListening();
            }, 500);
        }
    };
    
    currentUtterance.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        isReading = false;
        updateReadButton();
        
        // Restart listening even on error
        if (document.getElementById('voicePanel').style.display !== 'none') {
            setTimeout(() => {
                startListening();
            }, 500);
        }
    };
    
    // Start speaking
    isReading = true;
    updateReadButton();
    speechSynthesis.speak(currentUtterance);
}

function toggleReading() {
    if (isReading) {
        speechSynthesis.cancel();
        isReading = false;
    } else {
        speakListings(false);
    }
    updateReadButton();
}

function updateReadButton() {
    const readBtn = document.getElementById('readBtn');
    if (readBtn) {
        if (isReading) {
            readBtn.innerHTML = '⏹️ Stop Reading';
            readBtn.classList.add('active');
        } else {
            readBtn.innerHTML = '🔊 Read Listings';
            readBtn.classList.remove('active');
        }
    }
}

// Initialize voice recognition
function initializeVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showVoiceFeedback('Voice recognition not supported in this browser. Try Chrome or Edge.', 'error');
        document.getElementById('voiceBtn').disabled = true;
        return;
    }
    
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
        isListening = true;
        document.getElementById('voiceBtn').classList.add('active');
        document.getElementById('voiceStatusIcon').classList.add('listening');
        document.getElementById('voiceStatusText').textContent = 'Listening...';
        document.getElementById('voiceTranscript').textContent = '';
    };
    
    recognition.onend = function() {
        isListening = false;
        document.getElementById('voiceBtn').classList.remove('active');
        document.getElementById('voiceStatusIcon').classList.remove('listening');
        document.getElementById('voiceStatusText').textContent = 'Click to start listening';
    };
    
    recognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        document.getElementById('voiceTranscript').textContent = transcript;
        
        // Process command when speech is final
        if (event.results[event.results.length - 1].isFinal) {
            processVoiceCommand(transcript);
        }
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        showVoiceFeedback('Error: ' + event.error, 'error');
        isListening = false;
        document.getElementById('voiceBtn').classList.remove('active');
        document.getElementById('voiceStatusIcon').classList.remove('listening');
    };
}

// Initialize global voice recognition for wake word
function initializeGlobalVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Voice recognition not supported for global listening');
        return;
    }
    
    globalRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    globalRecognition.continuous = true; // Keep listening continuously
    globalRecognition.interimResults = false;
    globalRecognition.lang = 'en-US';
    
    globalRecognition.onstart = function() {
        isGlobalListening = true;
        console.log('Global voice recognition started - listening for wake word');
        showWakeWordStatus('listening');
    };
    
    globalRecognition.onend = function() {
        isGlobalListening = false;
        hideWakeWordStatus();
        // Restart global listening after a short delay
        setTimeout(() => {
            if (document.getElementById('voicePanel').style.display === 'none') {
                startGlobalListening();
            }
        }, 1000);
    };
    
    globalRecognition.onresult = function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        const command = transcript.toLowerCase().trim();
        console.log('Global command detected:', command);
        
        // Check for wake words to activate voice control
        const wakeWords = ['hey tv', 'tv assistant', 'voice control', 'activate voice', 'start listening'];
        
        for (const wakeWord of wakeWords) {
            if (command.includes(wakeWord)) {
                console.log('Wake word detected:', wakeWord);
                activateVoiceControl();
                return;
            }
        }
    };
    
    globalRecognition.onerror = function(event) {
        console.error('Global speech recognition error:', event.error);
        showWakeWordStatus('error');
        // Restart global listening on error
        setTimeout(() => {
            if (document.getElementById('voicePanel').style.display === 'none') {
                startGlobalListening();
            }
        }, 2000);
    };
}

// Start global listening for wake word
function startGlobalListening() {
    if (globalRecognition && !isGlobalListening && !isListening) {
        try {
            globalRecognition.start();
        } catch (e) {
            console.error('Failed to start global recognition:', e);
        }
    }
}

// Stop global listening
function stopGlobalListening() {
    if (globalRecognition && isGlobalListening) {
        try {
            globalRecognition.stop();
        } catch (e) {
            console.error('Failed to stop global recognition:', e);
        }
    }
}

// Activate voice control panel
function activateVoiceControl() {
    const voicePanel = document.getElementById('voicePanel');
    
    if (voicePanel.style.display === 'none') {
        // Stop global listening
        stopGlobalListening();
        
        // Hide wake word status
        hideWakeWordStatus();
        
        // Show voice panel
        voicePanel.style.display = 'block';
        
        // Initialize voice recognition if not already done
        if (!recognition) {
            initializeVoiceRecognition();
        }
        
        // Start listening for commands
        setTimeout(() => {
            startListening();
        }, 100);
        
        // Provide audio feedback
        speakFeedback('Voice control activated. You can now give commands.');
    }
}

// Speak feedback for voice activation
function speakFeedback(message) {
    if (speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        speechSynthesis.speak(utterance);
    }
}

// Show wake word status indicator
function showWakeWordStatus(status = 'listening') {
    const statusElement = document.getElementById('wakeWordStatus');
    const iconElement = document.getElementById('wakeWordIcon');
    const textElement = document.getElementById('wakeWordText');
    
    if (statusElement) {
        statusElement.style.display = 'flex';
        statusElement.className = `wake-word-status ${status}`;
        
        if (status === 'listening') {
            iconElement.textContent = '🎤';
            textElement.textContent = 'Listening for wake word';
        } else if (status === 'error') {
            iconElement.textContent = '⚠️';
            textElement.textContent = 'Voice recognition error';
        }
    }
}

// Hide wake word status indicator
function hideWakeWordStatus() {
    const statusElement = document.getElementById('wakeWordStatus');
    if (statusElement) {
        statusElement.style.display = 'none';
    }
}

// Toggle voice control
function toggleVoice() {
    const voicePanel = document.getElementById('voicePanel');
    
    if (voicePanel.style.display === 'none') {
        activateVoiceControl();
    } else {
        voicePanel.style.display = 'none';
        if (isListening && recognition) {
            recognition.stop();
        }
        // Also stop any ongoing speech
        if (speechSynthesis) {
            speechSynthesis.cancel();
        }
        
        // Restart global listening
        setTimeout(() => {
            startGlobalListening();
        }, 500);
    }
}

// Start listening for voice commands
function startListening() {
    if (recognition && !isListening) {
        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
        }
    }
}

// Process voice commands
function processVoiceCommand(transcript) {
    const command = transcript.toLowerCase().trim();
    console.log('Processing command:', command);
    
    // Check for commands to close voice control
    if (command.includes('close voice') || command.includes('stop listening') || command.includes('exit voice')) {
        toggleVoice();
        showVoiceFeedback('Voice control closed', 'success');
        return;
    }
    
    // Date commands - "show me friday july 11", etc.
    if (command.includes('show me')) {
        // Check for date matches
        let dateFound = false;
        
        // Check against available dates
        if (availableDates && availableDates.length > 0) {
            for (let i = 0; i < availableDates.length; i++) {
                const date = availableDates[i].toLowerCase();
                // Check if the command contains key parts of the date
                const dateParts = date.split(' ');
                let matches = 0;
                
                for (const part of dateParts) {
                    if (command.includes(part)) {
                        matches++;
                    }
                }
                
                // If we match at least 2 parts (e.g., "friday" and "11" or "july" and "11")
                if (matches >= 2) {
                    document.getElementById('dateSelector').value = i.toString();
                    wasVoiceTriggered = true; // Mark as voice triggered
                    scrapeListings(true);
                    showVoiceFeedback(`Getting listings for ${availableDates[i]}...`, 'success');
                    dateFound = true;
                    break;
                }
            }
        }
        
        // If no date found, check for network/type filters
        if (!dateFound) {
            const networks = ['ABC', 'CBS', 'NBC', 'FOX', 'CW', 'Discovery', 'Hallmark', 'HGTV', 'History', 'TBS', 'TNT', 'USA', 'SYFY', 'TLC', 'E!', 'NIK', 'TCM', 'Telemundo', 'truTV', 'HFAM', 'HMYS'];
            let networkFound = false;
            
            for (const network of networks) {
                if (command.toLowerCase().includes(network.toLowerCase())) {
                    document.getElementById('networkFilter').value = network;
                    filterListings();
                    showVoiceFeedback(`Showing ${network} programs`, 'success');
                    networkFound = true;
                    break;
                }
            }
            
            // Type filters
            if (!networkFound) {
                if (command.includes('movies')) {
                    document.getElementById('typeFilter').value = 'movies';
                    filterListings();
                    showVoiceFeedback('Showing movies only', 'success');
                } else if (command.includes('all programs') || command.includes('everything')) {
                    document.getElementById('typeFilter').value = '';
                    document.getElementById('networkFilter').value = '';
                    filterListings();
                    showVoiceFeedback('Showing all programs', 'success');
                } else {
                    showVoiceFeedback('Try "Show me Friday July 11" or "Show me NBC"', 'error');
                }
            }
        }
    }
    
    // Clear filters
    else if (command.includes('clear filter')) {
        document.getElementById('networkFilter').value = '';
        document.getElementById('timeFilter').value = '';
        document.getElementById('typeFilter').value = '';
        filterListings();
        showVoiceFeedback('Filters cleared', 'success');
    }
    
    else {
        showVoiceFeedback('Try saying "Show me Friday July 11" or "Show me NBC"', 'error');
    }
    
    // Always restart listening after processing a command
    setTimeout(() => {
        if (document.getElementById('voicePanel').style.display !== 'none') {
            startListening();
        }
    }, 2000);
}

// Show voice feedback
function showVoiceFeedback(message, type = 'success') {
    const feedback = document.createElement('div');
    feedback.className = `voice-feedback ${type}`;
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 3000);
}

// Initialize date selector with dates from the website
function initializeDateSelector() {
    const dateSelector = document.getElementById('dateSelector');
    
    // First, fetch the available dates from the website
    fetch('/scrape?date=0')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.dates && data.dates.length > 0) {
                // Update the selector with actual available dates
                dateSelector.innerHTML = '';
                data.dates.forEach((date, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = date; // Just show the date as-is
                    dateSelector.appendChild(option);
                });
                
                // Store available dates globally
                availableDates = data.dates;
            }
        })
        .catch(error => {
            console.error('Error fetching dates:', error);
        });
}

// Show alert messages
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = message;
    
    const alertsContainer = document.getElementById('alerts');
    alertsContainer.innerHTML = '';
    alertsContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Show loading spinner
function showLoading() {
    document.getElementById('resultsContent').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Getting TV listings... Please wait.</p>
            <p style="margin-top: 10px; color: #999; font-size: 14px;">
                Fetching data from the Audio Description Project website...
            </p>
        </div>
    `;
}

// Scrape TV listings
async function scrapeListings() {
    const scrapeBtn = document.getElementById('scrapeBtn');
    const dateSelector = document.getElementById('dateSelector');
    const selectedIndex = dateSelector.value;
    
    scrapeBtn.disabled = true;
    showLoading();
    
    try {
        // Use the date index to scrape
        const response = await fetch(`/scrape?date=${selectedIndex}`);
        const data = await response.json();
        
        if (data.success) {
            allListings = data.listings;
            filteredListings = allListings;
            availableDates = data.dates || [];
            
            // Update network filter options
            updateNetworkFilter(data.networks);
            
            // Update stats
            updateStats();
            
            // Update current date display
            const dateDisplay = document.getElementById('currentDateDisplay');
            if (data.current_date) {
                dateDisplay.textContent = `- ${data.current_date}`;
            }
            
            // Display results
            displayListings(filteredListings);
            
            // Show read button
            document.getElementById('readBtn').style.display = 'inline-flex';
            
            let message = `Successfully retrieved ${data.listings.length} listings`;
            if (data.current_date) {
                message += ` for ${data.current_date}`;
            }
            showAlert(message + '!');
            
            // Auto-read if this was triggered by voice command
            if (wasVoiceTriggered) {
                setTimeout(() => {
                    speakListings(true);
                }, 1000); // Give time for the page to update
                wasVoiceTriggered = false; // Reset flag
            }
        } else {
            showAlert('Failed to scrape listings. Please try again.', 'error');
            document.getElementById('resultsContent').innerHTML = `
                <div class="no-data">
                    <p>Failed to scrape TV listings.</p>
                    <p style="margin-top: 10px; color: #666;">Error: ${data.error || 'Unknown error'}</p>
                    <p style="margin-top: 10px; color: #666; font-size: 14px;">
                        Note: The website only provides data for today and the next 4 days.
                    </p>
                </div>
            `;
        }
    } catch (error) {
        showAlert('Network error. Please check your connection.', 'error');
        console.error('Error:', error);
    } finally {
        scrapeBtn.disabled = false;
    }
}

// Update network filter dropdown
function updateNetworkFilter(networks) {
    const select = document.getElementById('networkFilter');
    select.innerHTML = '<option value="">All Networks</option>';
    
    // Add broadcast networks first
    const broadcastNetworks = ['ABC', 'CBS', 'FOX', 'NBC', 'CW'];
    const broadcast = networks.filter(n => broadcastNetworks.includes(n));
    const cable = networks.filter(n => !broadcastNetworks.includes(n));
    
    if (broadcast.length > 0) {
        const optgroup1 = document.createElement('optgroup');
        optgroup1.label = 'Broadcast';
        broadcast.forEach(network => {
            const option = document.createElement('option');
            option.value = network;
            option.textContent = network;
            optgroup1.appendChild(option);
        });
        select.appendChild(optgroup1);
    }
    
    if (cable.length > 0) {
        const optgroup2 = document.createElement('optgroup');
        optgroup2.label = 'Cable';
        cable.forEach(network => {
            const option = document.createElement('option');
            option.value = network;
            option.textContent = network;
            optgroup2.appendChild(option);
        });
        select.appendChild(optgroup2);
    }
}

// Update statistics
function updateStats() {
    const stats = document.getElementById('stats');
    stats.style.display = 'flex';
    
    const uniqueNetworks = [...new Set(allListings.map(l => l.network))];
    const movieCount = allListings.filter(l => l.is_movie).length;
    
    document.getElementById('totalCount').textContent = allListings.length;
    document.getElementById('networkCount').textContent = uniqueNetworks.length;
    document.getElementById('movieCount').textContent = movieCount;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
}

// Display listings in table
function displayListings(listings) {
    const content = document.getElementById('resultsContent');
    
    if (listings.length === 0) {
        content.innerHTML = '<div class="no-data"><p>No listings match your filters.</p></div>';
        return;
    }
    
    let html = `
        <p style="margin-bottom: 10px; color: #666;">
            Showing ${listings.length} listings
            ${allListings.length > 0 && listings.length < allListings.length ? 
                ` (filtered from ${allListings.length} total)` : ''}
        </p>
        <table>
            <thead>
                <tr>
                    <th width="15%">Time</th>
                    <th width="15%">Network</th>
                    <th width="70%">Program</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    listings.forEach(listing => {
        const movieTag = listing.is_movie ? '<span class="movie-tag">MOVIE</span>' : '';
        html += `
            <tr>
                <td>${listing.time}</td>
                <td>${listing.network}</td>
                <td>${listing.program} ${movieTag}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    content.innerHTML = html;
}

// Filter listings based on user selections
function filterListings() {
    const networkFilter = document.getElementById('networkFilter').value;
    const timeFilter = document.getElementById('timeFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    filteredListings = allListings.filter(listing => {
        // Network filter
        if (networkFilter && listing.network !== networkFilter) {
            return false;
        }
        
        // Time filter
        if (timeFilter) {
            const hour = parseInt(listing.time.split(':')[0]);
            const isPM = listing.time.includes('PM');
            let hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
            
            switch(timeFilter) {
                case 'morning':
                    if (hour24 < 6 || hour24 >= 12) return false;
                    break;
                case 'afternoon':
                    if (hour24 < 12 || hour24 >= 18) return false;
                    break;
                case 'prime':
                    if (hour24 < 18 || hour24 >= 23) return false;
                    break;
                case 'late':
                    if (hour24 >= 6 && hour24 < 23) return false;
                    break;
            }
        }
        
        // Type filter
        if (typeFilter === 'movies' && !listing.is_movie) {
            return false;
        }
        if (typeFilter === 'series' && listing.is_movie) {
            return false;
        }
        
        return true;
    });
    
    displayListings(filteredListings);
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize date selector with proper labels
    initializeDateSelector();
    
    // Initialize global voice recognition for wake word
    initializeGlobalVoiceRecognition();
    
    // Start global listening after a short delay
    setTimeout(() => {
        startGlobalListening();
    }, 2000);
    
    // Add event listeners for filters
    document.getElementById('networkFilter').addEventListener('change', filterListings);
    document.getElementById('timeFilter').addEventListener('change', filterListings);
    document.getElementById('typeFilter').addEventListener('change', filterListings);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + V to activate voice control
        if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
            event.preventDefault();
            activateVoiceControl();
        }
        
        // Escape to close voice control
        if (event.key === 'Escape') {
            const voicePanel = document.getElementById('voicePanel');
            if (voicePanel.style.display !== 'none') {
                toggleVoice();
            }
        }
    });
});