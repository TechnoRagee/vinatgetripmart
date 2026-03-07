require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Query = require('./models/Query');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Health-check endpoint (required by Render)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'VintageTripmart', time: new Date() });
});

// MongoDB Connection
if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables!');
    process.exit(1);
}
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB successfully!'))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// ─── API Routes ────────────────────────────────────────────────────────────────

// POST - Submit a new travel query
app.post('/api/query', async (req, res) => {
    try {
        const { name, email, phone, destination, travelDate, travelers, budget, message } = req.body;

        const newQuery = new Query({
            name,
            email,
            phone,
            destination,
            travelDate,
            travelers,
            budget,
            message,
        });

        await newQuery.save();

        res.status(201).json({
            success: true,
            message: 'Your query has been submitted successfully! Our team will contact you within 24 hours.',
            data: newQuery,
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// GET - Retrieve all queries (admin use)
app.get('/api/queries', async (req, res) => {
    try {
        const queries = await Query.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: queries.length, data: queries });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET - Single query by ID
app.get('/api/queries/:id', async (req, res) => {
    try {
        const query = await Query.findById(req.params.id);
        if (!query) return res.status(404).json({ success: false, message: 'Query not found.' });
        res.status(200).json({ success: true, data: query });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUT - Update query status
app.put('/api/queries/:id', async (req, res) => {
    try {
        const query = await Query.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!query) return res.status(404).json({ success: false, message: 'Query not found.' });
        res.status(200).json({ success: true, data: query });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE - Delete a query
app.delete('/api/queries/:id', async (req, res) => {
    try {
        const query = await Query.findByIdAndDelete(req.params.id);
        if (!query) return res.status(404).json({ success: false, message: 'Query not found.' });
        res.status(200).json({ success: true, message: 'Query deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Serve SPA pages
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 VintageTripmart server running on http://localhost:${PORT}`);
});
