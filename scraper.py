import requests
from bs4 import BeautifulSoup
import json
import logging
import re
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class TVListingsScraper:
    """Scraper for Audio Description Project TV Listings"""
    
    def __init__(self, base_url: str = "https://adp.acb.org"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
    
    def extract_drupal_settings(self, html_content: str) -> Dict:
        """
        Extract drupalSettings from the page
        
        Args:
            html_content: The HTML content of the page
            
        Returns:
            Dictionary containing the drupalSettings or empty dict if not found
        """
        # Look for the drupalSettings JSON in the HTML
        pattern = r'<script[^>]*type="application/json"[^>]*data-drupal-selector="drupal-settings-json"[^>]*>([^<]+)</script>'
        match = re.search(pattern, html_content, re.DOTALL)
        
        if match:
            try:
                settings_json = match.group(1).strip()
                return json.loads(settings_json)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse drupalSettings JSON: {e}")
                return {}
        
        logger.warning("Could not find drupalSettings in the page")
        return {}
    
    def extract_table_data(self, html_content: str) -> List[Dict[str, str]]:
        """
        Extract TV listings from the HTML table
        
        Args:
            html_content: The HTML content of the page
            
        Returns:
            List of dictionaries containing TV listing information
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        listings = []
        
        # Find the table
        table = soup.find('table', id='daily-schedule')
        if not table:
            logger.warning("Could not find daily-schedule table")
            return listings
        
        # Get the date from the page
        date_header = soup.find('h3', class_='date-header')
        current_date = date_header.text.strip() if date_header else "Unknown Date"
        
        # Find all rows in tbody
        tbody = table.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            logger.info(f"Found {len(rows)} rows in the table")
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 3:
                    listing = {
                        'time': cells[0].text.strip(),
                        'network': cells[1].text.strip(),
                        'program': cells[2].text.strip(),
                        'date': current_date,
                        'is_movie': '[MOVIE]' in cells[2].text
                    }
                    listings.append(listing)
        
        return listings
    
    def scrape_daily_schedule(self) -> Tuple[List[Dict[str, str]], Dict]:
        """
        Scrape the daily TV schedule
        
        Returns:
            Tuple of (listings, metadata) where:
            - listings: List of TV listing dictionaries
            - metadata: Dictionary containing networks, dates, and current date
        """
        url = f"{self.base_url}/tv-listings"
        
        try:
            logger.info(f"Fetching TV listings from {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            html_content = response.text
            
            # Extract drupalSettings
            drupal_settings = self.extract_drupal_settings(html_content)
            
            # Extract metadata from drupalSettings
            metadata = {
                'networks': [],
                'dates': [],
                'current_date': 'Unknown Date'
            }
            
            if 'tvListings' in drupal_settings:
                tv_settings = drupal_settings['tvListings']
                metadata['networks'] = tv_settings.get('networks', [])
                metadata['dates'] = tv_settings.get('dates', [])
                metadata['current_date'] = tv_settings.get('currentDate', 'Unknown Date')
                logger.info(f"Found metadata - Networks: {len(metadata['networks'])}, Dates: {len(metadata['dates'])}")
            
            # Extract table data
            listings = self.extract_table_data(html_content)
            logger.info(f"Extracted {len(listings)} TV listings")
            
            return listings, metadata
            
        except requests.RequestException as e:
            logger.error(f"Error fetching data: {e}")
            return [], {}
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return [], {}
    
    def scrape_by_date(self, date_string: str = None, date_index: int = None) -> Tuple[List[Dict[str, str]], Dict]:
        """
        Scrape TV listings for a specific date
        
        Args:
            date_string: Full date string (e.g., "Saturday, July 12")
            date_index: Index of the date (0 = first date in list)
            
        Returns:
            Tuple of (listings, metadata)
        """
        base_url = f"{self.base_url}/tv-listings"
        
        # If index 0 (today), don't use any date parameter - let the site default to today
        if date_index == 0:
            url = base_url
        elif date_string:
            url = f"{base_url}?date={requests.utils.quote(date_string)}"
        elif date_index is not None and date_index > 0:
            # First get the available dates
            _, metadata = self.scrape_daily_schedule()
            dates = metadata.get('dates', [])
            if 0 <= date_index < len(dates):
                date_string = dates[date_index]
                url = f"{base_url}?date={requests.utils.quote(date_string)}"
            else:
                logger.warning(f"Invalid date index {date_index}. Using default URL.")
                url = base_url
        else:
            url = base_url
        
        try:
            logger.info(f"Fetching TV listings from {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            html_content = response.text
            
            # Extract drupalSettings
            drupal_settings = self.extract_drupal_settings(html_content)
            
            # Extract metadata from drupalSettings
            metadata = {
                'networks': [],
                'dates': [],
                'current_date': 'Unknown Date'
            }
            
            if 'tvListings' in drupal_settings:
                tv_settings = drupal_settings['tvListings']
                metadata['networks'] = tv_settings.get('networks', [])
                metadata['dates'] = tv_settings.get('dates', [])
                metadata['current_date'] = tv_settings.get('currentDate', 'Unknown Date')
                logger.info(f"Scraped data for: {metadata['current_date']}")
            
            # Extract table data
            listings = self.extract_table_data(html_content)
            logger.info(f"Extracted {len(listings)} TV listings")
            
            return listings, metadata
            
        except requests.RequestException as e:
            logger.error(f"Error fetching data: {e}")
            return [], {}
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return [], {}
    
    def scrape_all_dates(self) -> Dict[str, Tuple[List[Dict[str, str]], str]]:
        """
        Scrape TV listings for all available dates
        
        Returns:
            Dictionary with date strings as keys and (listings, date) tuples as values
        """
        all_data = {}
        
        # First get available dates
        _, metadata = self.scrape_daily_schedule()
        available_dates = metadata.get('dates', [])
        
        if not available_dates:
            logger.warning("No dates found in metadata")
            return all_data
        
        logger.info(f"Scraping data for {len(available_dates)} dates: {available_dates}")
        
        # Scrape each date
        for date_string in available_dates:
            logger.info(f"Scraping {date_string}...")
            listings, date_metadata = self.scrape_by_date(date_string=date_string)
            
            if listings:
                all_data[date_string] = (listings, date_metadata.get('current_date', date_string))
                logger.info(f"✓ Scraped {len(listings)} listings for {date_string}")
            else:
                logger.warning(f"✗ No listings found for {date_string}")
        
        return all_data
    
    def extract_metadata(self, html_content: str) -> Dict:
        """Extract metadata from HTML content"""
        drupal_settings = self.extract_drupal_settings(html_content)
        
        metadata = {
            'networks': [],
            'dates': [],
            'current_date': 'Unknown Date'
        }
        
        if 'tvListings' in drupal_settings:
            tv_settings = drupal_settings['tvListings']
            metadata['networks'] = tv_settings.get('networks', [])
            metadata['dates'] = tv_settings.get('dates', [])
            metadata['current_date'] = tv_settings.get('currentDate', 'Unknown Date')
        
        return metadata
    
    def get_available_dates(self) -> List[str]:
        """
        Get list of available dates from the TV listings page
        
        Returns:
            List of available date strings
        """
        _, metadata = self.scrape_daily_schedule()
        return metadata.get('dates', [])
    
    def get_available_networks(self) -> List[str]:
        """
        Get list of available networks from the TV listings page
        
        Returns:
            List of available network names
        """
        _, metadata = self.scrape_daily_schedule()
        return metadata.get('networks', [])