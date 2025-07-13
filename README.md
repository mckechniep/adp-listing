# Descrip-TV
## Audio Description TV Listings Scraper & Voice Assistant

Descrip-TV is an accessible web app that helps users—especially those who are blind or visually impaired—find and explore TV listings with audio description. The app scrapes the latest TV schedule data from the [Audio Description Project](https://adp.acb.org) and provides a modern, voice-controlled interface for searching, filtering, and reading listings aloud.

![Descrip-TV header image](static/img/descrip-tv-header.png)

---

## Features

- **Live TV Listings Scraper:**  
  Fetches up-to-date TV listings (with audio description) for today and the next 4 days from the ADP website.

- **Voice Control & Wake Words:**  
  Hands-free operation using wake words like “Hey TV” or “TV Assistant.”  
  Natural language commands for searching, filtering, and reading listings.

- **Accessible by Design:**  
  - Large, clear visuals and high-contrast UI
  - Full keyboard navigation
  - Screen reader and speech synthesis support

- **Smart Filtering:**  
  Filter listings by network, time of day (morning, afternoon, prime time, late night), or program type (movies/series).

- **Flexible Reading:**  
  - Have listings read aloud by time period or custom time range
  - Continue, repeat, or reset reading with simple voice commands

- **Modern, Responsive UI:**  
  - Works on desktop and mobile
  - Stylish illustrations and clear instructions

---

## Demo

![Screenshot of Descrip-TV web app](static/img/webapp-demo.png)
![Screenshot of Descrip-TV console](static/img/console-demo.png)

---

## How It Works

- **Backend:**  
  Python Flask app with a custom scraper (`scraper.py`) that extracts TV listings and metadata from the ADP website.

- **Frontend:**  
  HTML5, CSS3, and vanilla JavaScript.  
  Uses the Web Speech API for voice recognition and speech synthesis.

- **Voice Commands:**  
  Users can activate voice control, fetch listings for a specific date, filter by time/network/type, and have results read aloud—all by voice.

---

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/descrip-tv.git
   cd descrip-tv
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the app:**
   ```bash
   python app.py
   ```
   The app will be available at [http://localhost:5000](http://localhost:5000).

---

## Usage

1. **Open the app in your browser.**
2. **Enable speech synthesis** if prompted (press any key or click the enable button).
3. **Say a wake word** (e.g., “Hey TV”) or click the “Voice Control” button.
4. **Ask for listings** (e.g., “Show me Friday July 11”).
5. **Use voice commands** to filter or read listings (e.g., “Read prime time listings”, “Read more listings”, “Reset”).
6. **Filter manually** using the dropdowns for network, time, or type.

---

## Voice Commands

- **Wake Words:** “Hey TV”, “TV Assistant”, “Voice Control”, “Activate Voice”, “Start Listening”
- **Get Listings:** “Show me [date]”, “Show [date]”
- **Read Listings:** “Read listings”, “Read all listings”, “Read morning listings”, “Read listings from 8 PM to 11 PM”, etc.
- **Continue/Repeat:** “Read more listings”, “Read again”, “Repeat that”
- **Reset:** “Reset”, “Start over”, “Show all”
- **Close Voice Control:** “Close voice”, “Stop listening”, “Exit voice”

See the in-app help for a full list!

---

## Project Structure

```
adp-listings/
├── app.py                  # Flask app
├── scraper.py              # TV listings scraper
├── static/
│   ├── css/style.css       # Styles
│   ├── js/app.js           # Frontend logic
│   └── img/                # Images and illustrations
├── templates/
│   └── index.html          # Main HTML template
├── requirements.txt
└── README.md
```

---

## Accessibility

- Designed for screen readers and keyboard navigation
- Large, high-contrast visuals
- Voice-first interaction for blind/low-vision users

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.

---

## License

[MIT](LICENSE)

---

## Credits

- TV listings data: [Audio Description Project](https://adp.acb.org)
- Illustrations: Microsoft Designer
- Built with Flask, BeautifulSoup, and the Web Speech API

---

**Descrip-TV: Making TV listings accessible for everyone!**

---
