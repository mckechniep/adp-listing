# TV Listings Scraper Web App

This is a Flask-based web application that scrapes and displays TV listings data from the Audio Description Project (ADP) website.

The app extracts TV schedule information from adp.acb.org/tv-listings and presents it in a user-friendly web interface with advanced filtering and accessibility features.

## Key Features

### Data Scraping:

- Fetches TV listings for today and the next 4 days
- Extracts program times, networks, and program names
- Identifies movies vs. series programs
- Gets metadata including available dates and networks

### Interactive Web Interface:

- Date selector to choose different days
- Network filtering (ABC, CBS, NBC, FOX, etc.)
- Time period filtering (Morning, Afternoon, Prime Time, Late Night)
- Program type filtering (Movies vs. Series)

Accessibility Features:
Voice Control: Users can speak commands like "Show me Friday July 11" or "Show me NBC"
Text-to-Speech: Reads listings aloud with natural speech synthesis
Voice command processing for hands-free navigation
Data Presentation:
Clean table format showing time, network, and program
Statistics dashboard (total listings, networks, movies count)
Real-time filtering without page reloads
Responsive design
Technical Architecture
Backend: Python Flask server with BeautifulSoup web scraping
Frontend: Vanilla JavaScript with modern web APIs (Speech Recognition, Speech Synthesis)
Data Source: Audio Description Project website (drupal-based)
Dependencies: Flask, requests, beautifulsoup4, pandas, numpy
Purpose
This appears to be designed for accessibility research or advocacy, specifically for the Audio Description Project which focuses on making TV content accessible to visually impaired viewers. The app helps users quickly find and filter TV programs that have audio descriptions available.
The combination of web scraping, voice control, and text-to-speech suggests it's built with accessibility in mind, making TV schedule information easily accessible to users who may have visual impairments or prefer voice interaction.