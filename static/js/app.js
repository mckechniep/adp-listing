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
let audioContext = null; // For Web Audio API
let speechSynthesisEnabled = false; // Track if speech synthesis is working
let lastReadIndex = 0; // Track where we left off reading

// Test function for speech synthesis
function testSpeechSynthesis() {
    console.log('Manual speech synthesis test...');
    
    // Try to enable speech synthesis if not already enabled
    if (!speechSynthesisEnabled && window.speechSynthesis) {
        speechSynthesisEnabled = true;
    }
    
    if (speechSynthesis && speechSynthesisEnabled) {
        const testUtterance = new SpeechSynthesisUtterance('This is a test of speech synthesis functionality');
        testUtterance.onend = function() {
            console.log('Manual test completed successfully');
            showVoiceFeedback('Speech synthesis test successful!', 'success');
        };
        testUtterance.onerror = function(event) {
            console.error('Manual test error:', event);
            if (event.error === 'not-allowed') {
                showVoiceFeedback('Speech synthesis blocked. Please press any key or tap the screen, then try again.', 'error');
                speechSynthesisEnabled = false;
            } else {
                showVoiceFeedback('Speech synthesis test failed: ' + event.error, 'error');
            }
        };
        speechSynthesis.speak(testUtterance);
    } else {
        console.error('Speech synthesis not available');
        showVoiceFeedback('Speech synthesis not available in this browser. Please try pressing any key or tapping the screen first.', 'error');
    }
}

// Alternative speech method using Web Speech API
function speakWithFallback(text) {
    if (speechSynthesis && speechSynthesisEnabled) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        return utterance;
    } else {
        // Fallback: try to enable speech synthesis and retry
        if (window.speechSynthesis) {
            speechSynthesisEnabled = true;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            return utterance;
        }
        return null;
    }
}

// Add a visible button for blind users to enable speech synthesis
function addSpeechSynthesisButton() {
    // Check if button already exists
    if (document.getElementById('enableSpeechBtn')) {
        return;
    }
    
    const button = document.createElement('button');
    button.id = 'enableSpeechBtn';
    button.className = 'btn-primary';
    button.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
        background: #e74c3c;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    button.innerHTML = '🔊 Enable Speech Synthesis';
    button.setAttribute('aria-label', 'Enable speech synthesis for voice commands');
    
    button.addEventListener('click', function() {
        if (window.speechSynthesis) {
            speechSynthesisEnabled = true;
            const testUtterance = new SpeechSynthesisUtterance('Speech synthesis enabled');
            testUtterance.onend = function() {
                showVoiceFeedback('Speech synthesis enabled! You can now use voice commands.', 'success');
                button.style.display = 'none';
            };
            testUtterance.onerror = function(event) {
                console.error('Failed to enable speech synthesis:', event);
                showVoiceFeedback('Failed to enable speech synthesis. Please try again.', 'error');
            };
            window.speechSynthesis.speak(testUtterance);
        }
    });
    
    // Add keyboard shortcut
    button.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            button.click();
        }
    });
    
    document.body.appendChild(button);
    
    // Hide button after 30 seconds or when speech synthesis is enabled
    setTimeout(() => {
        if (speechSynthesisEnabled) {
            button.style.display = 'none';
        }
    }, 30000);
}

// Initialize audio context for accessibility
function initializeAudioContext() {
    try {
        // Create audio context for better audio support
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio context initialized');
    } catch (e) {
        console.log('Audio context not available:', e);
    }
}

// Check if speech synthesis is ready
function isSpeechSynthesisReady() {
    if (!speechSynthesis) {
        return false;
    }
    
    // If speech synthesis hasn't been enabled yet, try to enable it
    if (!speechSynthesisEnabled) {
        console.log('Speech synthesis not yet enabled');
        return false;
    }
    
    // Check if speech synthesis is suspended (common in some browsers)
    if (speechSynthesis.speaking === false && speechSynthesis.pending === false) {
        try {
            speechSynthesis.resume();
        } catch (e) {
            console.log('Speech synthesis resume failed:', e);
        }
    }
    
    return true;
}

// Text-to-speech functionality
function speakListings(autoRead = false) {
    if (!isSpeechSynthesisReady()) {
        console.error('Text-to-speech not supported or not ready');
        
        // Provide accessible feedback for blind users
        if (!speechSynthesisEnabled) {
            showVoiceFeedback('Speech synthesis needs to be enabled. Look for the red "Enable Speech Synthesis" button in the top-left corner, or press any key.', 'error');
            
            // Show the enable button if it's not visible
            const enableBtn = document.getElementById('enableSpeechBtn');
            if (enableBtn && enableBtn.style.display === 'none') {
                enableBtn.style.display = 'block';
            }
            
            // Also try to enable speech synthesis automatically (this usually won't work due to browser restrictions)
            if (window.speechSynthesis) {
                const enableUtterance = new SpeechSynthesisUtterance('Enabling speech synthesis');
                enableUtterance.onend = function() {
                    speechSynthesisEnabled = true;
                    console.log('Speech synthesis enabled automatically');
                    // Try to read listings again
                    setTimeout(() => {
                        speakListings(autoRead);
                    }, 500);
                };
                enableUtterance.onerror = function(event) {
                    console.error('Failed to enable speech synthesis:', event);
                    showVoiceFeedback('Please click the "Enable Speech Synthesis" button or press any key to enable speech synthesis.', 'error');
                };
                window.speechSynthesis.speak(enableUtterance);
            }
        } else {
            showVoiceFeedback('Speech synthesis error. Please try again.', 'error');
        }
        return;
    }
    
    console.log('speakListings called with autoRead:', autoRead);
    console.log('Current listings - allListings:', allListings.length, 'filteredListings:', filteredListings.length);
    
    // Reset reading index when starting fresh
    lastReadIndex = 0;
    
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
    console.log('Listings to read:', listingsToRead);
    
    if (listingsToRead.length === 0) {
        console.error('No listings available to read');
        showVoiceFeedback('No listings available to read. Please get listings first.', 'error');
        return;
    }
    
    textToRead += `Showing ${listingsToRead.length} listings. `;
    
    // Read ALL listings when triggered by voice (not just 5)
    const maxListings = autoRead ? Math.min(listingsToRead.length, 20) : 10; // Limit to 20 for voice, 10 for button
    const readCount = Math.min(listingsToRead.length, maxListings);
    
    console.log('Will read', readCount, 'listings out of', listingsToRead.length);
    
    for (let i = 0; i < readCount; i++) {
        const listing = listingsToRead[i];
        textToRead += `At ${listing.time}, on ${listing.network}, ${listing.program}. `;
    }
    
    if (listingsToRead.length > readCount) {
        textToRead += `And ${listingsToRead.length - readCount} more listings.`;
        // Update lastReadIndex for continuation
        lastReadIndex = readCount;
    }
    
    console.log('Text to read:', textToRead);
    
    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.rate = 0.9; // Slightly slower for clarity
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    
    console.log('Speech synthesis utterance created:', currentUtterance);
    console.log('Speech synthesis available:', speechSynthesis);
    console.log('Speech synthesis speaking:', speechSynthesis.speaking);
    
    // Handle completion
    currentUtterance.onend = function() {
        console.log('Speech synthesis completed');
        isReading = false;
        updateReadButton();
        
        // If this was triggered by voice command, revert to wake word listening
        if (wasVoiceTriggered) {
            setTimeout(() => {
                // Close voice control panel
                const voicePanel = document.getElementById('voicePanel');
                if (voicePanel) {
                    voicePanel.style.display = 'none';
                }
                
                // Stop current voice recognition
                if (isListening && recognition) {
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.log('Recognition already stopped');
                    }
                }
                
                // Restart global listening after a longer delay
                setTimeout(() => {
                    startGlobalListening();
                    showVoiceFeedback('Returning to wake word listening', 'info');
                    wasVoiceTriggered = false;
                }, 500);
            }, 1000);
        }
    };
    
    currentUtterance.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        isReading = false;
        updateReadButton();
        
        // Handle specific error types
        if (event.error === 'not-allowed') {
            showVoiceFeedback('Speech synthesis blocked. Please click the page first, then try again.', 'error');
            console.log('Speech synthesis blocked - user interaction required');
        } else if (event.error === 'network') {
            showVoiceFeedback('Network error with speech synthesis. Please try again.', 'error');
        } else if (event.error === 'synthesis-failed') {
            showVoiceFeedback('Speech synthesis failed. Please try again.', 'error');
        } else {
            showVoiceFeedback('Speech synthesis error: ' + event.error, 'error');
        }
        
        // If this was triggered by voice command, revert to wake word listening
        if (wasVoiceTriggered) {
            setTimeout(() => {
                // Close voice control and return to wake word listening
                toggleVoice();
                showVoiceFeedback('Returning to wake word listening', 'info');
                wasVoiceTriggered = false; // Reset the flag
            }, 1000);
        }
    };
    
    // Start speaking
    isReading = true;
    updateReadButton();
    console.log('Starting speech synthesis...');
    speechSynthesis.speak(currentUtterance);
    console.log('Speech synthesis speak() called');
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

// Helper function to convert time to 24-hour format
function timeTo24Hour(timeStr) {
    const hour = parseInt(timeStr.split(':')[0]);
    const isPM = timeStr.includes('PM');
    return isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
}

// Helper function to check if a listing is in a specific time period
function isListingInTimePeriod(listing, timePeriod) {
    const hour = timeTo24Hour(listing.time);
    
    switch(timePeriod) {
        case 'morning':
            return hour >= 6 && hour < 12;
        case 'afternoon':
            return hour >= 12 && hour < 18;
        case 'prime':
            return hour >= 18 && hour < 23;
        case 'late':
            return hour >= 23 || hour < 6;
        default:
            return true;
    }
}

// Read listings by time period
function readListingsByTime(timePeriod) {
    const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
    
    if (listingsToRead.length === 0) {
        showVoiceFeedback('No listings to read. Please get listings first.', 'error');
        return;
    }
    
    // Filter listings by time period
    const timeFilteredListings = listingsToRead.filter(listing => isListingInTimePeriod(listing, timePeriod));
    
    if (timeFilteredListings.length === 0) {
        const periodNames = {
            'morning': 'morning (6 AM - 12 PM)',
            'afternoon': 'afternoon (12 PM - 6 PM)',
            'prime': 'prime time (6 PM - 11 PM)',
            'late': 'late night (11 PM - 6 AM)'
        };
        showVoiceFeedback(`No listings found for ${periodNames[timePeriod]}.`, 'error');
        return;
    }
    
    // Reset reading index for new time period
    lastReadIndex = 0;
    
    // Read the filtered listings
    speakSpecificListings(timeFilteredListings, true, timePeriod);
}

// Read listings by specific time range
function readListingsByTimeRange(command) {
    const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
    
    if (listingsToRead.length === 0) {
        showVoiceFeedback('No listings to read. Please get listings first.', 'error');
        return;
    }
    
    // Extract time range from command (basic implementation)
    // This could be enhanced with more sophisticated time parsing
    const timeMatch = command.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:to|until|-)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
    
    if (!timeMatch) {
        showVoiceFeedback('Please specify a time range like "Read listings from 7 PM to 10 PM"', 'error');
        return;
    }
    
    const startTime = timeMatch[1];
    const endTime = timeMatch[2];
    
    // Filter listings by time range
    const rangeFilteredListings = listingsToRead.filter(listing => {
        const listingHour = timeTo24Hour(listing.time);
        const startHour = timeTo24Hour(startTime);
        const endHour = timeTo24Hour(endTime);
        
        // Handle overnight ranges
        if (endHour < startHour) {
            return listingHour >= startHour || listingHour < endHour;
        } else {
            return listingHour >= startHour && listingHour < endHour;
        }
    });
    
    if (rangeFilteredListings.length === 0) {
        showVoiceFeedback(`No listings found between ${startTime} and ${endTime}.`, 'error');
        return;
    }
    
    // Reset reading index for new time range
    lastReadIndex = 0;
    
    // Read the filtered listings
    speakSpecificListings(rangeFilteredListings, true, `${startTime} to ${endTime}`);
}

// Continue reading from where we left off
function continueReadingListings() {
    const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
    
    if (listingsToRead.length === 0) {
        showVoiceFeedback('No listings to read. Please get listings first.', 'error');
        return;
    }
    
    if (lastReadIndex >= listingsToRead.length) {
        showVoiceFeedback('You have reached the end of the listings.', 'info');
        return;
    }
    
    // Read next 10 listings
    const nextListings = listingsToRead.slice(lastReadIndex, lastReadIndex + 10);
    speakSpecificListings(nextListings, false, 'next 10 listings');
    lastReadIndex += 10;
}

// Read all remaining listings
function readRemainingListings() {
    const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
    
    if (listingsToRead.length === 0) {
        showVoiceFeedback('No listings to read. Please get listings first.', 'error');
        return;
    }
    
    if (lastReadIndex >= listingsToRead.length) {
        showVoiceFeedback('You have reached the end of the listings.', 'info');
        return;
    }
    
    // Read all remaining listings
    const remainingListings = listingsToRead.slice(lastReadIndex);
    speakSpecificListings(remainingListings, false, 'remaining listings');
    lastReadIndex = listingsToRead.length;
}

// Speak listings summary and guidance
function speakListingsSummary() {
    if (!isSpeechSynthesisReady()) {
        console.error('Text-to-speech not supported or not ready');
        showVoiceFeedback('Speech synthesis needs to be enabled. Please press any key or tap the screen.', 'error');
        return;
    }
    
    // Stop voice recognition while speaking
    if (isListening && recognition) {
        recognition.stop();
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Prepare the summary text
    let textToRead = '';
    
    // Add the header information
    const dateDisplay = document.getElementById('currentDateDisplay').textContent.replace('- ', '');
    if (dateDisplay) {
        textToRead += `TV Listings for ${dateDisplay}. `;
    }
    
    // Add count and guidance
    const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
    const totalListings = listingsToRead.length;
    
    textToRead += `Found ${totalListings} TV listings. `;
    
    if (totalListings > 0) {
        textToRead += `You can say "Read morning listings" for 6 AM to 12 PM shows, "Read afternoon listings" for 12 PM to 6 PM shows, "Read prime time listings" for 6 PM to 11 PM shows, or "Read late night listings" for 11 PM to 6 AM shows. `;
        textToRead += `You can also say "Read listings from 8 PM to 11 PM" for a specific time range, or "Read all listings" to hear everything. `;
        textToRead += `What would you like to hear?`;
    } else {
        textToRead += `No listings found for this date.`;
    }
    
    console.log('Summary text to read:', textToRead);
    
    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.rate = 0.9;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    
    // Handle completion
    currentUtterance.onend = function() {
        console.log('Summary speech synthesis completed');
        isReading = false;
        updateReadButton();
        
        // If this was triggered by voice command, revert to wake word listening
        if (wasVoiceTriggered) {
            setTimeout(() => {
                // Close voice control panel
                const voicePanel = document.getElementById('voicePanel');
                if (voicePanel) {
                    voicePanel.style.display = 'none';
                }
                
                // Stop current voice recognition
                if (isListening && recognition) {
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.log('Recognition already stopped');
                    }
                }
                
                // Restart global listening after a longer delay
                setTimeout(() => {
                    startGlobalListening();
                    showVoiceFeedback('Returning to wake word listening', 'info');
                    wasVoiceTriggered = false;
                }, 500);
            }, 1000);
        }
    };
    
    currentUtterance.onerror = function(event) {
        console.error('Summary speech synthesis error:', event);
        isReading = false;
        updateReadButton();
        
        if (event.error === 'not-allowed') {
            showVoiceFeedback('Speech synthesis blocked. Please click the page first, then try again.', 'error');
        } else {
            showVoiceFeedback('Speech synthesis error: ' + event.error, 'error');
        }
        
        if (wasVoiceTriggered) {
            setTimeout(() => {
                // Close voice control panel
                const voicePanel = document.getElementById('voicePanel');
                if (voicePanel) {
                    voicePanel.style.display = 'none';
                }
                
                // Stop current voice recognition
                if (isListening && recognition) {
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.log('Recognition already stopped');
                    }
                }
                
                // Restart global listening after a longer delay
                setTimeout(() => {
                    startGlobalListening();
                    showVoiceFeedback('Returning to wake word listening', 'info');
                    wasVoiceTriggered = false;
                }, 500);
            }, 1000);
        }
    };
    
    // Start speaking
    isReading = true;
    updateReadButton();
    speechSynthesis.speak(currentUtterance);
}

// Speak specific listings with context
function speakSpecificListings(listings, autoRead = false, context = '') {
    if (!isSpeechSynthesisReady()) {
        console.error('Text-to-speech not supported or not ready');
        showVoiceFeedback('Speech synthesis needs to be enabled. Please press any key or tap the screen.', 'error');
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
    
    // Add context information
    if (context) {
        textToRead += `${context}. `;
    }
    
    textToRead += `Showing ${listings.length} listings. `;
    
    // Read all listings in the filtered set
    for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        textToRead += `At ${listing.time}, on ${listing.network}, ${listing.program}. `;
    }
    
    console.log('Text to read:', textToRead);
    
    // Create utterance
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.rate = 0.9;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    
    // Handle completion
    currentUtterance.onend = function() {
        console.log('Speech synthesis completed');
        isReading = false;
        updateReadButton();
        
        // If this was triggered by voice command, revert to wake word listening
        if (wasVoiceTriggered) {
            setTimeout(() => {
                toggleVoice();
                showVoiceFeedback('Returning to wake word listening', 'info');
                wasVoiceTriggered = false;
            }, 1000);
        }
    };
    
    currentUtterance.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        isReading = false;
        updateReadButton();
        
        if (event.error === 'not-allowed') {
            showVoiceFeedback('Speech synthesis blocked. Please click the page first, then try again.', 'error');
        } else {
            showVoiceFeedback('Speech synthesis error: ' + event.error, 'error');
        }
        
        if (wasVoiceTriggered) {
            setTimeout(() => {
                // Close voice control panel
                const voicePanel = document.getElementById('voicePanel');
                if (voicePanel) {
                    voicePanel.style.display = 'none';
                }
                
                // Stop current voice recognition
                if (isListening && recognition) {
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.log('Recognition already stopped');
                    }
                }
                
                // Restart global listening after a longer delay
                setTimeout(() => {
                    startGlobalListening();
                    showVoiceFeedback('Returning to wake word listening', 'info');
                    wasVoiceTriggered = false;
                }, 500);
            }, 1000);
        }
    };
    
    // Start speaking
    isReading = true;
    updateReadButton();
    speechSynthesis.speak(currentUtterance);
}

// Initialize voice recognition
function initializeVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showVoiceFeedback('Voice recognition not supported in this browser. Try Chrome or Edge.', 'error');
        document.getElementById('voiceBtn').disabled = true;
        return;
    }
    
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true; // Keep listening continuously for multiple commands
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
        
        // Restart listening automatically if voice panel is still open
        setTimeout(() => {
            if (document.getElementById('voicePanel').style.display !== 'none' && !isReading) {
                startListening();
            }
        }, 1000);
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
        
        // Check for "read again" command that works even in wake word mode
        if (command.includes('read again') || command.includes('read it again') || 
            command.includes('repeat that') || command.includes('say that again')) {
            
            console.log('Read again command detected in wake word mode:', command);
            
            // Check if there are listings to read
            const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
            console.log('Read again - listings to read - filteredListings:', filteredListings.length, 'allListings:', allListings.length);
            
            if (listingsToRead.length > 0) {
                console.log('Read again command detected in wake word mode');
                showVoiceFeedback('Reading listings again...', 'success');
                speakListings(true);
            } else {
                showVoiceFeedback('No listings to read. Please get listings first.', 'error');
            }
        }
        
        // Time-based reading commands that work in wake word mode
        else if (command.includes('read morning') || command.includes('morning listings') || command.includes('morning shows')) {
            console.log('Morning listings command detected in wake word mode:', command);
            readListingsByTime('morning');
        }
        else if (command.includes('read afternoon') || command.includes('afternoon listings') || command.includes('afternoon shows')) {
            console.log('Afternoon listings command detected in wake word mode:', command);
            readListingsByTime('afternoon');
        }
        else if (command.includes('read prime') || command.includes('prime time') || command.includes('evening listings') || command.includes('evening shows')) {
            console.log('Prime time listings command detected in wake word mode:', command);
            readListingsByTime('prime');
        }
        else if (command.includes('read late') || command.includes('late night') || command.includes('night listings') || command.includes('night shows')) {
            console.log('Late night listings command detected in wake word mode:', command);
            readListingsByTime('late');
        }
        // Specific time range commands
        else if (command.includes('read listings from') || command.includes('read shows from')) {
            console.log('Specific time range command detected in wake word mode:', command);
            readListingsByTimeRange(command);
        }
        // Continue reading commands
        else if (command.includes('read next') || command.includes('read more') || command.includes('continue reading')) {
            console.log('Continue reading command detected in wake word mode:', command);
            continueReadingListings();
        }
        else if (command.includes('read remaining') || command.includes('read rest')) {
            console.log('Read remaining command detected in wake word mode:', command);
            readRemainingListings();
        }
        // Read all listings command
        else if (command.includes('read all listing') || command.includes('read all listings') || command.includes('read everything')) {
            console.log('Read all listings command detected in wake word mode:', command);
            
            const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
            if (listingsToRead.length > 0) {
                showVoiceFeedback('Reading all listings...', 'success');
                speakSpecificListings(listingsToRead, true, 'all listings');
            } else {
                showVoiceFeedback('No listings to read. Please get listings first.', 'error');
            }
        }
        // Regular read listings commands
        else if (command.includes('read listing') || command.includes('read the listing') || 
                 command.includes('read result') || command.includes('read them') ||
                 command.includes('speak listing') || command.includes('tell me the listing') ||
                 command.includes('what are the listing') || command.includes('repeat listing') ||
                 command.includes('read it') || command.includes('read those') ||
                 command.includes('read listings') || command.includes('read the listings') ||
                 command.includes('tell me the listings') || command.includes('what are the listings') ||
                 command.includes('speak the listings') || command.includes('read the results') ||
                 command.includes('tell me what') || command.includes('what shows') ||
                 command.includes('what programs') || command.includes('what movies')) {
            
            console.log('Read listings command detected in wake word mode:', command);
            
            const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
            if (listingsToRead.length > 0) {
                showVoiceFeedback('Reading listings...', 'success');
                speakListings(true);
            } else {
                showVoiceFeedback('No listings to read. Please get listings first.', 'error');
            }
        }
        
        // Check for "reset" or "start over" commands
        else if (command.includes('reset') || command.includes('start over') || 
                 command.includes('clear all') || command.includes('new search') ||
                 command.includes('begin again') || command.includes('restart')) {
            
            console.log('Reset command detected in wake word mode:', command);
            
            // Clear all filters
            document.getElementById('networkFilter').value = '';
            document.getElementById('timeFilter').value = '';
            document.getElementById('typeFilter').value = '';
            
            // Reset listings
            filteredListings = allListings;
            
            // Update display
            displayListings(filteredListings);
            
            showVoiceFeedback('Reset complete. Ready for new search.', 'success');
        }
    };
    
    globalRecognition.onerror = function(event) {
        console.error('Global speech recognition error:', event.error);
        showWakeWordStatus('error');
        
        // Don't restart if voice panel is open or if we're in the middle of a transition
        if (document.getElementById('voicePanel').style.display === 'none' && !wasVoiceTriggered) {
            setTimeout(() => {
                startGlobalListening();
            }, 2000);
        }
    };
}

// Start global listening for wake word
function startGlobalListening() {
    if (globalRecognition && !isGlobalListening && !isListening) {
        try {
            // Add a small delay to ensure any previous recognition is fully stopped
            setTimeout(() => {
                if (!isGlobalListening && !isListening) {
                    globalRecognition.start();
                }
            }, 100);
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
        speakFeedback('Voice Control Activated');
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
    
    if (voicePanel.style.display === 'none' || voicePanel.style.display === '') {
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
        let commandProcessed = false;
        
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
                    commandProcessed = true;
                    break;
                }
            }
        }
        
        // If no date found, provide helpful feedback
        if (!dateFound) {
            showVoiceFeedback('Try "Show me Friday July 11" for date-based listings', 'error');
        }
        
        // If we processed a command that will auto-read, don't restart listening
        if (commandProcessed) {
            return;
        }
    }
    
    // Clear filters
    else if (command.includes('clear filter')) {
        document.getElementById('networkFilter').value = '';
        document.getElementById('timeFilter').value = '';
        document.getElementById('typeFilter').value = '';
        filterListings();
        showVoiceFeedback('Filters cleared', 'success');
        
        // Trigger auto-read
        setTimeout(() => {
            speakListings(true);
        }, 500);
    }
    
    // Read listings commands
    else if (command.includes('read all listing') || command.includes('read all listings') || command.includes('read everything')) {
        console.log('Read all listings command detected:', command);
        
        // Check if there are listings to read
        const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
        console.log('Listings to read - filteredListings:', filteredListings.length, 'allListings:', allListings.length);
        
        if (listingsToRead.length > 0) {
            showVoiceFeedback('Reading all listings...', 'success');
            // Read all listings when user specifically requests it
            speakSpecificListings(listingsToRead, true, 'all listings');
        } else {
            showVoiceFeedback('No listings to read. Please get listings first.', 'error');
        }
    }
    else if (command.includes('read listing') || command.includes('read the listing') || 
             command.includes('read result') || command.includes('read them') ||
             command.includes('speak listing') || command.includes('tell me the listing') ||
             command.includes('what are the listing') || command.includes('repeat listing') ||
             command.includes('read it') || command.includes('read those') ||
             command.includes('read listings') || command.includes('read the listings') ||
             command.includes('tell me the listings') || command.includes('what are the listings') ||
             command.includes('speak the listings') || command.includes('read the results') ||
             command.includes('tell me what') || command.includes('what shows') ||
             command.includes('what programs') || command.includes('what movies')) {
        
        console.log('Read listings command detected:', command);
        
        // Check if there are listings to read
        const listingsToRead = filteredListings.length > 0 ? filteredListings : allListings;
        console.log('Listings to read - filteredListings:', filteredListings.length, 'allListings:', allListings.length);
        
        if (listingsToRead.length > 0) {
            showVoiceFeedback('Reading listings...', 'success');
            // Use true to read more listings (up to 20) when triggered by voice
            speakListings(true);
        } else {
            showVoiceFeedback('No listings to read. Please get listings first.', 'error');
        }
    }
    
    // Time-based reading commands
    else if (command.includes('read morning') || command.includes('morning listings') || command.includes('morning shows')) {
        console.log('Morning listings command detected:', command);
        readListingsByTime('morning');
    }
    else if (command.includes('read afternoon') || command.includes('afternoon listings') || command.includes('afternoon shows')) {
        console.log('Afternoon listings command detected:', command);
        readListingsByTime('afternoon');
    }
    else if (command.includes('read prime') || command.includes('prime time') || command.includes('evening listings') || command.includes('evening shows')) {
        console.log('Prime time listings command detected:', command);
        readListingsByTime('prime');
    }
    else if (command.includes('read late') || command.includes('late night') || command.includes('night listings') || command.includes('night shows')) {
        console.log('Late night listings command detected:', command);
        readListingsByTime('late');
    }
    // Specific time range commands
    else if (command.includes('read listings from') || command.includes('read shows from')) {
        console.log('Specific time range command detected:', command);
        readListingsByTimeRange(command);
    }
    // Continue reading commands
    else if (command.includes('read next') || command.includes('read more') || command.includes('continue reading')) {
        console.log('Continue reading command detected:', command);
        continueReadingListings();
    }
    else if (command.includes('read remaining') || command.includes('read rest')) {
        console.log('Read remaining command detected:', command);
        readRemainingListings();
    }
    

    
    // Reset/start over commands
    else if (command.includes('reset') || command.includes('start over') || 
             command.includes('clear all') || command.includes('new search') ||
             command.includes('begin again') || command.includes('restart') ||
             command.includes('clear filters') || command.includes('show all')) {
        
        console.log('Reset command detected:', command);
        
        // Clear all filters
        document.getElementById('networkFilter').value = '';
        document.getElementById('timeFilter').value = '';
        document.getElementById('typeFilter').value = '';
        
        // Reset listings
        filteredListings = allListings;
        
        // Update display
        displayListings(filteredListings);
        
        showVoiceFeedback('Reset complete. Ready for new search.', 'success');
    }
    
    else {
        showVoiceFeedback('Try saying "Show me Friday July 11", "Read listings", or "Reset"', 'error');
    }
    
    // No need to restart listening since we're using continuous mode
    // The voice recognition will keep listening automatically
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
            console.log('Scraping successful, data received:', data);
            allListings = data.listings;
            filteredListings = allListings;
            availableDates = data.dates || [];
            
            console.log('Listings loaded - allListings:', allListings.length, 'filteredListings:', filteredListings.length);
            console.log('Sample listing:', allListings[0]);
            
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
            
            // Show filters section
            document.getElementById('filtersSection').style.display = 'block';
            
            let message = `Successfully retrieved ${data.listings.length} listings`;
            if (data.current_date) {
                message += ` for ${data.current_date}`;
            }
            showAlert(message + '!');
            
            // Provide summary and guidance if this was triggered by voice command
            if (wasVoiceTriggered) {
                console.log('Voice-triggered summary, wasVoiceTriggered:', wasVoiceTriggered);
                setTimeout(() => {
                    speakListingsSummary();
                }, 1000); // Give time for the page to update
                // Don't reset wasVoiceTriggered here - let speakListingsSummary handle it
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
            
            // Hide filters section on error
            document.getElementById('filtersSection').style.display = 'none';
        }
    } catch (error) {
        showAlert('Network error. Please check your connection.', 'error');
        console.error('Error:', error);
        
        // Hide filters section on network error
        document.getElementById('filtersSection').style.display = 'none';
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
    // Initialize audio context for accessibility
    initializeAudioContext();
    
    // Test speech synthesis on page load
    console.log('Testing speech synthesis...');
    console.log('Speech synthesis available:', window.speechSynthesis);
    console.log('Speech synthesis speaking:', window.speechSynthesis?.speaking);
    
    // Initialize date selector with proper labels
    initializeDateSelector();
    
    // Initialize voice recognition (but don't start listening yet)
    initializeVoiceRecognition();
    
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
    
    // Enable speech synthesis on any user interaction
    const enableSpeechSynthesis = function() {
        if (!speechSynthesisEnabled && window.speechSynthesis) {
            console.log('Enabling speech synthesis...');
            speechSynthesisEnabled = true;
            
            // Test speech synthesis
            const testUtterance = new SpeechSynthesisUtterance('Speech synthesis enabled');
            testUtterance.onend = function() {
                console.log('Speech synthesis test successful');
                showVoiceFeedback('Speech synthesis is now enabled', 'success');
            };
            testUtterance.onerror = function(event) {
                console.error('Speech synthesis test failed:', event);
                speechSynthesisEnabled = false;
            };
            window.speechSynthesis.speak(testUtterance);
        }
    };
    
    // Enable speech synthesis on any user interaction
    document.addEventListener('click', enableSpeechSynthesis, { once: true });
    document.addEventListener('keydown', enableSpeechSynthesis, { once: true });
    document.addEventListener('touchstart', enableSpeechSynthesis, { once: true });
    
    // Add a visible button for blind users to enable speech synthesis
    addSpeechSynthesisButton();
    
    // Also enable on voice activation (but this won't work due to browser restrictions)
    const originalActivateVoiceControl = activateVoiceControl;
    activateVoiceControl = function() {
        // Voice activation can't enable speech synthesis due to browser security
        // But we can provide helpful feedback
        if (!speechSynthesisEnabled) {
            showVoiceFeedback('Voice control activated. To enable speech synthesis, please press any key or tap the screen.', 'info');
        }
        originalActivateVoiceControl();
    };
});