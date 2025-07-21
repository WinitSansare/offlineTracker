# Local Master

This is a simple offline web application for tracking log entries and branch records. It uses [Dexie.js](https://dexie.org/) for client-side storage and allows you to manage data without a server.

## Features

- Add, edit and delete log records
- Add, edit and delete branches
- Export logs to an Excel file
- Import logs from an Excel file
- Filter logs and paginate results
- Visual charts for status distribution and logs per branch
- Charts always visualize the full data stored in Dexie
- Optional dark mode toggle
- Export logs table to PDF
- Navigation tabs for logs, branches and visualizations


## Usage

Open `index.html` in your web browser. The data is stored locally in your browser using IndexedDB via Dexie. No additional setup is required.

## Development

The main application files are:

- `index.html` – page layout and modals
- `style.css` – basic styling for the interface
- `script.js` – logic for managing logs, branches and Excel operations

Feel free to modify these files to suit your needs.
