
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const app = express(); // <- MUST exist before app.use / app.set

// Read env vars with sensible fallbacks
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigconnect';

// ---- SETUP EJS ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ---- MONGO CONNECTION ----
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// ---- MIDDLEWARE ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- MODELS ----
const Worker = require('./models/workers');

// ===========================
//        EJS ROUTES
// ===========================
app.get('/', (req, res) => res.render('index', { title: 'GigConnect — Home' }));
app.get('/howitworks', (req, res) => res.render('howitworks', { title: 'How GigConnect Works' }));
app.get('/findHelpNow', (req, res) => res.render('findHelpNow', { title: 'Find Help' }));
app.get('/contactus', (req, res) => res.render('contactus', { title: 'Contact Us' }));
app.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up' }));
app.get('/clientlogin', (req, res) => res.render('clientlogin', { title: 'Client Login' }));
app.get('/professionallogin', (req, res) => res.render('professionallogin', { title: 'Professional Login' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register as Professional' }));

// ===========================
//     YOUR API ROUTES
// ===========================

// escape helper (prevents regexp injection)
function escapeRegex(text = '') {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/workers - read/search workers
app.get('/api/workers', async (req, res) => {
  try {
    const skillQ = req.query.skill?.trim() || null;
    const cityQ  = req.query.city?.trim() || null;
    const nameQ  = req.query.name?.trim() || null;

    const andClauses = [];

    if (cityQ) {
      const escapedCity = escapeRegex(cityQ);
      andClauses.push({ city: { $regex: `^\\s*${escapedCity}\\s*$`, $options: 'i' } });
    }

    const orClauses = [];
    if (nameQ) orClauses.push({ name: { $regex: nameQ, $options: 'i' } });
    if (skillQ) orClauses.push({ skills: { $elemMatch: { $regex: skillQ, $options: 'i' } } });
    if (orClauses.length) andClauses.push({ $or: orClauses });

    const finalQuery = andClauses.length ? { $and: andClauses } : {};
    const workers = await Worker.find(finalQuery).lean().select('-__v');

    res.json(workers);
  } catch (err) {
    console.error('GET /api/workers error:', err);
    res.status(500).json({ message: 'Error fetching workers' });
  }
});

// POST /api/workers - create worker (validation + sanitization)
const workerValidators = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  body('city').isString().trim().isLength({ min: 2, max: 100 }),
  body('skills').custom(v => {
    if (Array.isArray(v)) return true;
    if (typeof v === "string" && v.trim().length > 0) return true;
    throw new Error("skills required");
  }),
  body('experience').isInt({ min: 0, max: 100 })
];

app.post('/api/workers', workerValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    // Normalize and sanitize inputs
    const rawName = req.body.name || '';
    const rawCity = req.body.city || '';
    const rawContact = req.body.contact || '';

    const name = sanitizeHtml(String(rawName).trim(), { allowedTags: [], allowedAttributes: {} });
    const city = sanitizeHtml(String(rawCity).trim(), { allowedTags: [], allowedAttributes: {} }).toLowerCase();
    const contact = String(rawContact).trim();

    let skillsArr = Array.isArray(req.body.skills)
      ? req.body.skills
      : String(req.body.skills).split(',').map(s => s.trim().toLowerCase());

    skillsArr = skillsArr.filter(Boolean);

    if (!skillsArr.length) return res.status(422).json({ message: 'At least one skill required' });

    const experience = Number(req.body.experience) || 0;
    const ratings = req.body.ratings !== undefined ? Number(req.body.ratings) : 0;
    const distance = req.body.distance !== undefined ? Number(req.body.distance) : 0;
    const photo = req.body.photo ? String(req.body.photo).trim() : undefined;
    const description = req.body.description ? sanitizeHtml(String(req.body.description), { allowedTags: [], allowedAttributes: {} }) : undefined;

    const worker = await Worker.create({
      name,
      contact,
      city,
      skills: skillsArr,
      experience,
      ratings,
      distance,
      photo,
      description
    });

    res.status(201).json(worker);
  } catch (e) {
    console.error('POST /api/workers error:', e);
    // duplicate key handling (e.g., unique contact)
    if (e && e.code === 11000) return res.status(409).json({ message: 'Duplicate key error' });
    res.status(500).json({ message: "Error creating worker" });
  }
});

// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
