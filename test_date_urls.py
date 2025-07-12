#!/usr/bin/env python3
"""
Test different methods to access different dates on the TV listings page
"""

import requests
from bs4 import BeautifulSoup
import json

def test_date_access():
    base_url = "https://adp.acb.org/tv-listings"
    
    # Test different URL patterns
    test_urls = [
        # Index-based
        (f"{base_url}?date=0", "Index 0 (today)"),
        (f"{base_url}?date=1", "Index 1 (tomorrow)"),
        (f"{base_url}?day=1", "Day parameter"),
        
        # Date string based
        (f"{base_url}?date=Saturday", "Saturday string"),
        (f"{base_url}?date=Saturday,%20July%2012", "Full date string"),
        
        # Path-based
        (f"{base_url}/1", "Path index"),
        (f"{base_url}/saturday", "Path day name"),
        
        # Form/POST based (simulate form submission)
        (base_url, "POST request")
    ]
    
    session = requests.Session()
    
    print("=== TESTING DATE ACCESS METHODS ===\n")
    
    for url, description in test_urls:
        print(f"Testing: {description}")
        print(f"URL: {url}")
        
        try:
            if description == "POST request":
                # Try POST with form data
                response = session.post(url, data={
                    'date': '1',
                    'date_filter': '1',
                    'selected_date': 'Saturday, July 12'
                })
            else:
                response = session.get(url)
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Check current date
                date_header = soup.find('h3', class_='date-header')
                if date_header:
                    print(f"Date shown: {date_header.text.strip()}")
                
                # Count rows
                table = soup.find('table', id='daily-schedule')
                if table:
                    tbody = table.find('tbody')
                    if tbody:
                        rows = tbody.find_all('tr')
                        print(f"Number of rows: {len(rows)}")
                        
                        # Check first program to see if data changed
                        if rows:
                            cells = rows[0].find_all('td')
                            if len(cells) >= 3:
                                print(f"First program: {cells[1].text.strip()} - {cells[2].text.strip()}")
                
                # Check if drupalSettings changed
                scripts = soup.find_all('script', type='application/json')
                for script in scripts:
                    if 'drupal-settings-json' in str(script):
                        try:
                            settings = json.loads(script.string)
                            if 'tvListings' in settings:
                                current = settings['tvListings'].get('currentDate', 'Unknown')
                                print(f"drupalSettings currentDate: {current}")
                        except:
                            pass
            
            print("-" * 50)
            
        except Exception as e:
            print(f"Error: {e}")
            print("-" * 50)
    
    # Also check for cookies/session behavior
    print("\n=== CHECKING SESSION/COOKIES ===")
    print(f"Session cookies: {session.cookies.get_dict()}")

if __name__ == "__main__":
    test_date_access()