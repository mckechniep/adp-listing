// Global variables
let allListings = [];
let filteredListings = [];
let availableDates = [];

// Initialize date selector with proper labels
function initializeDateSelector() {
    const dateSelector = document.getElementById('dateSelector');
    const options = dateSelector.options;
    
    // Get today's date
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Update option labels with actual dates
    for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dayName = days[date.getDay()];
        const monthName = months[date.getMonth()];
        const dayNum = date.getDate();
        
        let label;
        if (i === 0) {
            label = `Today (${dayName}, ${monthName} ${dayNum})`;
        } else if (i === 1) {
            label = `Tomorrow (${dayName}, ${monthName} ${dayNum})`;
        } else {
            label = `${dayName}, ${monthName} ${dayNum}`;
        }
        
        options[i].text = label;
        options[i].setAttribute('data-date', `${dayName}, ${monthName} ${dayNum}`);
    }
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
            <p>Scraping TV listings... Please wait.</p>
            <p style="margin-top: 10px; color: #999; font-size: 14px;">
                Extracting data from the Audio Description Project website...
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
            
            // Enable download buttons
            document.getElementById('downloadCsvBtn').disabled = false;
            document.getElementById('downloadJsonBtn').disabled = false;
            
            let message = `Successfully scraped ${data.listings.length} listings`;
            if (data.current_date) {
                message += ` for ${data.current_date}`;
            }
            showAlert(message + '!');
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

// Download data
async function downloadData(format) {
    const data = filteredListings.length > 0 ? filteredListings : allListings;
    
    if (data.length === 0) {
        showAlert('No data to download. Please scrape listings first.', 'info');
        return;
    }
    
    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                format: format,
                data: data
            })
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tv_listings_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showAlert(`Downloaded ${data.length} listings as ${format.toUpperCase()}`);
    } catch (error) {
        showAlert('Error downloading file.', 'error');
        console.error('Error:', error);
    }
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize date selector with proper labels
    initializeDateSelector();
    
    // Add event listeners for filters
    document.getElementById('networkFilter').addEventListener('change', filterListings);
    document.getElementById('timeFilter').addEventListener('change', filterListings);
    document.getElementById('typeFilter').addEventListener('change', filterListings);
});