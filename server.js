require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
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
mongoose.set('bufferCommands', false); // Fail fast instead of hanging form submissions
mongoose
    .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('✅ Connected to MongoDB successfully!'))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        // Do not process.exit(1) so the app stays alive and serves pages
    });

// ─── Email Transporter Setup ───────────────────────────────────────────────────
const EMAIL_USER = process.env.EMAIL_USER || 'vintagetripmart@outlook.com';
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com', // More reliable for modern Outlook/O365
    port: 587,
    secure: false, // TLS
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
});

// Helper to send email
const sendNotificationEmail = async (subject, text) => {
    if (!EMAIL_PASS) {
        console.warn('⚠️ EMAIL_PASS environment variable is NOT set. Email notifications are disabled.');
        return;
    }

    console.log(`📡 Attempting to send email to ${EMAIL_USER}...`);

    try {
        await transporter.sendMail({
            from: `"VintageTripmart Website" <${EMAIL_USER}>`,
            to: EMAIL_USER, // Sends the notification to yourself
            subject: subject,
            text: text,
        });
        console.log('✅ Notification email sent successfully.');
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        if (error.message.includes('auth') || error.message.includes('login')) {
            console.error('💡 TIP: Check if your App Password is correct and Multi-Factor Auth is enabled on your Microsoft account.');
        }
    }
};

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

        // Send email notification in the background
        const emailBody = `
New Travel Query Received!

Name: ${name}
Email: ${email}
Phone: ${phone}
Destination: ${destination}
Travel Date: ${travelDate}
Travelers: ${travelers}
Budget: ${budget}

Additional Message:
${message || 'None'}
`;
        sendNotificationEmail(`New Query from ${name} for ${destination}`, emailBody);

    } catch (error) {
        console.error("Query Submit Error:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Database connection failed. Please check your MongoDB IP whitelist.' });
    }
});

// POST - Submit a contact message (from Contact Us page)
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        res.status(200).json({
            success: true,
            message: 'Message sent! We will reply within 24 hours.',
        });

        // Send email immediately
        const emailBody = `
New Contact Form Message!

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
`;
        sendNotificationEmail(`Contact Form: ${subject} (from ${name})`, emailBody);

    } catch (error) {
        console.error(error);
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VintageTripmart server running on http://0.0.0.0:${PORT}`);
});
