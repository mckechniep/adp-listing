from flask import Flask, render_template, request, jsonify
from scraper import TVListingsScraper
from datetime import datetime
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global variable to store scraped data
scraped_data = {
    'listings': [],
    'networks': [],
    'dates': [],
    'last_scraped': None,
    'is_scraping': False
}

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/scrape')
def scrape():
    """Endpoint to scrape TV listings"""
    global scraped_data
    
    if scraped_data['is_scraping']:
        return jsonify({'success': False, 'message': 'Scraping already in progress'})
    
    scraped_data['is_scraping'] = True
    
    try:
        scraper = TVListingsScraper()
        
        # Get date parameter
        date_param = request.args.get('date', '')
        
        # First, get available dates
        _, base_metadata = scraper.scrape_daily_schedule()
        available_dates = base_metadata.get('dates', [])
        
        # Determine which date to scrape
        if date_param.isdigit():
            # It's an index
            date_index = int(date_param)
            if 0 <= date_index < len(available_dates):
                listings, metadata = scraper.scrape_by_date(date_index=date_index)
            else:
                listings, metadata = scraper.scrape_daily_schedule()
        elif date_param:
            # It's a date string
            listings, metadata = scraper.scrape_by_date(date_string=date_param)
        else:
            # No date specified, get current
            listings, metadata = scraper.scrape_daily_schedule()
        
        if not listings:
            return jsonify({
                'success': False,
                'error': 'No listings found for the selected date.',
                'listings': [],
                'networks': base_metadata.get('networks', []),
                'dates': available_dates
            })
        
        # Update global data
        scraped_data['listings'] = listings
        scraped_data['networks'] = metadata.get('networks', [])
        scraped_data['dates'] = available_dates
        scraped_data['last_scraped'] = datetime.now().isoformat()
        
        return jsonify({
            'success': True,
            'listings': listings,
            'networks': scraped_data['networks'],
            'dates': scraped_data['dates'],
            'current_date': metadata.get('current_date', 'Unknown'),
            'total': len(listings)
        })
    
    except Exception as e:
        logger.error(f"Scraping error: {e}")
        return jsonify({
            'success': False, 
            'error': str(e),
            'listings': [],
            'networks': [],
            'dates': []
        })
    
    finally:
        scraped_data['is_scraping'] = False

@app.route('/scrape-all')
def scrape_all():
    """Endpoint to scrape all available dates"""
    global scraped_data
    
    if scraped_data['is_scraping']:
        return jsonify({'success': False, 'message': 'Scraping already in progress'})
    
    scraped_data['is_scraping'] = True
    
    try:
        scraper = TVListingsScraper()
        
        # Scrape all dates
        all_dates_data = scraper.scrape_all_dates()
        
        if not all_dates_data:
            return jsonify({
                'success': False,
                'error': 'No data found for any dates.',
                'data': {}
            })
        
        # Combine all listings
        all_listings = []
        for date_string, (listings, actual_date) in all_dates_data.items():
            # Add date to each listing
            for listing in listings:
                listing['date'] = actual_date
            all_listings.extend(listings)
        
        # Get metadata from first successful scrape
        _, metadata = scraper.scrape_daily_schedule()
        
        return jsonify({
            'success': True,
            'data': all_dates_data,
            'all_listings': all_listings,
            'total_listings': len(all_listings),
            'dates_scraped': list(all_dates_data.keys()),
            'networks': metadata.get('networks', [])
        })
    
    except Exception as e:
        logger.error(f"Scraping error: {e}")
        return jsonify({
            'success': False, 
            'error': str(e),
            'data': {}
        })
    
    finally:
        scraped_data['is_scraping'] = False

@app.route('/status')
def status():
    """Get current scraping status"""
    return jsonify({
        'is_scraping': scraped_data['is_scraping'],
        'last_scraped': scraped_data['last_scraped'],
        'total_listings': len(scraped_data['listings']),
        'total_networks': len(scraped_data['networks'])
    })

if __name__ == '__main__':
    print("=" * 60)
    print("TV Listings Scraper Web App")
    print("=" * 60)
    print("\nThis scraper extracts TV listings data from the")
    print("Audio Description Project website.")
    print("\nThe site uses DataTables with client-side filtering,")
    print("so all data is embedded in the initial page load.")
    print("\nAccess the app at: http://localhost:5000")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)