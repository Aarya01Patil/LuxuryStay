# Luxury Stay - Premium Hotel Booking Platform

A modern, elegant hotel booking web application built with React and Flask, featuring a premium luxury design and seamless user experience.

![Luxury Stay](https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=60)

## 🌟 Features

- **Elegant Design**: Premium luxury aesthetic with gold, navy, and emerald color scheme.
- **Hotel Search**: Search hotels by destination, check-in/out dates, and guest count.
- **Guest Booking**: Book hotels instantly without requiring an account.
- **Mock Data Mode**: Explore the application with realistic mock data for various cities.
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices.

## 🎨 Tech Stack

### Frontend
- **React** 19.0 - Modern UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Sonner** - Toast notifications

### Backend
- **Python Flask** - Lightweight web framework (via FastAPI transition)
- **FastAPI** - High-performance API framework
- **MongoDB** - NoSQL database for flexible data storage
- **Hotel Data API** - Extended hotel database with 100+ properties

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Python 3.10+
- MongoDB (running locally or a cloud URI)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd LuxuryStay
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
   *Create a `.env` file in `backend/` with your MongoDB connection string:*
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=luxury_stay
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install --legacy-peer-deps
   ```
   *If you encounter dependency issues, try running:*
   ```bash
   npm install ajv ajv-keywords --save-dev --legacy-peer-deps
   ```

## 🏃 Running Locally

1. **Start the Backend Server**
   ```bash
   cd backend
   python server.py
   ```
   The backend will run on `http://localhost:5000`.

2. **Start the Frontend** (in a new terminal)
   ```bash
   cd frontend
   npm start
   ```
   The frontend will open at `http://localhost:3000`.

## 🌍 Mock Mode & Supported Cities

The application currently runs in **Mock Mode**, meaning it uses a local database of hotels instead of a live Booking.com API connection.

**Best Search Results:**
- Mumbai
- Goa
- Delhi
- Chennai
- Manali

*Note: Searching for other cities will display a fallback list of various mock hotels.*

## 🌐 Deployment

### Frontend: Vercel (Recommended)
1. Push your code to GitHub.
2. Visit [vercel.com](https://vercel.com) and import your repository.
3. Vercel will auto-detect the React app.
4. **Build Command**: `npm run build`
5. **Output Directory**: `build`
6. Deploy!

### Backend: Render (Recommended)
1. Push your code to GitHub.
2. Visit [render.com](https://render.com) and create a **Web Service**.
3. Connect your repository.
4. **Environment**: Python 3
5. **Build Command**: `pip install -r requirements.txt`
6. **Start Command**: `gunicorn -k uvicorn.workers.UvicornWorker server:app` or `python server.py`
7. Add Environment Variables (Mongo URL, etc.).
8. Deploy!

## 📝 License

This project is for educational purposes.
