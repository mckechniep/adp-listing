#!/usr/bin/env python3
"""
Script to analyze how the TV listings website handles multiple dates
Run this to understand the data structure
"""

import requests
from bs4 import BeautifulSoup
import json
import re

def analyze_tv_listings_structure():
    """Analyze the structure of TV listings to understand date handling"""
    
    url = "https://adp.acb.org/tv-listings"
    
    # Fetch the page
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    print("=== ANALYZING TV LISTINGS STRUCTURE ===\n")
    
    # 1. Check for drupalSettings
    script_tags = soup.find_all('script', type='application/json')
    for script in script_tags:
        if 'drupal-settings-json' in str(script):
            try:
                settings = json.loads(script.string)
                if 'tvListings' in settings:
                    tv_settings = settings['tvListings']
                    print(f"Available dates: {tv_settings.get('dates', [])}")
                    print(f"Current date: {tv_settings.get('currentDate', 'Unknown')}")
                    print(f"Number of networks: {len(tv_settings.get('networks', []))}")
            except:
                pass
    
    # 2. Analyze table structure
    table = soup.find('table', id='daily-schedule')
    if table:
        print(f"\n=== TABLE ANALYSIS ===")
        
        # Check table attributes
        print(f"Table classes: {table.get('class', [])}")
        print(f"Table attributes: {table.attrs}")
        
        # Check tbody
        tbody = table.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            print(f"\nTotal rows in tbody: {len(rows)}")
            
            # Analyze first few rows for patterns
            print("\nFirst 5 rows analysis:")
            for i, row in enumerate(rows[:5]):
                print(f"\nRow {i}:")
                print(f"  Classes: {row.get('class', [])}")
                print(f"  Data attributes: {[attr for attr in row.attrs if attr.startswith('data-')]}")
                
                cells = row.find_all('td')
                if len(cells) >= 3:
                    print(f"  Time: {cells[0].text.strip()}")
                    print(f"  Network: {cells[1].text.strip()}")
                    print(f"  Program: {cells[2].text.strip()}")
    
    # 3. Look for date-related elements
    print("\n=== DATE-RELATED ELEMENTS ===")
    
    # Find date filter
    date_filter = soup.find(id='date-filter')
    if date_filter:
        print(f"Date filter found: {date_filter.name}")
        options = date_filter.find_all('option')
        print(f"Date options: {[opt.text for opt in options]}")
    
    # Look for any elements with date-related IDs or classes
    date_elements = soup.find_all(attrs={'id': re.compile('date|day', re.I)})
    print(f"\nElements with date-related IDs: {len(date_elements)}")
    for elem in date_elements[:3]:
        print(f"  {elem.name} - ID: {elem.get('id')} - Classes: {elem.get('class', [])}")
    
    # 4. Check DataTables configuration
    print("\n=== DATATABLES CONFIGURATION ===")
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string and 'DataTable' in script.string:
            print("Found DataTables initialization script")
            # Try to extract configuration
            if '#daily-schedule' in script.string:
                print("DataTables is initialized on #daily-schedule")
                # Look for any date-related configuration
                if 'date' in script.string.lower():
                    print("Found date-related configuration in DataTables")
    
    # 5. Check for AJAX endpoints
    print("\n=== CHECKING FOR AJAX ENDPOINTS ===")
    for script in scripts:
        if script.string:
            # Look for AJAX URLs
            ajax_patterns = [
                r'url\s*:\s*["\']([^"\']+)["\']',
                r'ajax\s*:\s*["\']([^"\']+)["\']',
                r'\/tv-listings\/[^"\']+',
            ]
            for pattern in ajax_patterns:
                matches = re.findall(pattern, script.string)
                if matches:
                    print(f"Found potential AJAX endpoints: {matches}")

if __name__ == "__main__":
    analyze_tv_listings_structure()