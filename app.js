const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- SETUP EJS ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ---- MONGO CONNECTION ----
const MONGODB_URI = 'mongodb://localhost:27017/gigconnect';

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

// escape helper
function escapeRegex(text = '') {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    console.error(err);
    res.status(500).json({ message: 'Error fetching workers' });
  }
});

// POST /api/workers (existing logic)
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
    let skillsArr = Array.isArray(req.body.skills)
      ? req.body.skills
      : req.body.skills.split(',').map(s => s.trim().toLowerCase());

    const worker = await Worker.create({
      name: req.body.name,
      contact: req.body.contact,
      city: req.body.city,
      skills: skillsArr,
      experience: req.body.experience,
      ratings: req.body.ratings || 0,
      distance: req.body.distance || 0
    });

    res.status(201).json(worker);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error creating worker" });
  }
});

// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
