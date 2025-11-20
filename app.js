





// app.js

// --- PACKAGE IMPORTS ---

// Loads environment variables from the .env file into process.env
require('dotenv').config();

// Imports the Express.js framework for building web applications
const express = require('express');
// Imports Mongoose, an ODM (Object Data Modeling) library for MongoDB
const mongoose = require('mongoose');
// Imports Node.js's built-in path module for handling file paths
const path = require('path');
// Imports express-ejs-layouts middleware for EJS templating layouts
const expressLayouts = require('express-ejs-layouts');
// Imports specific functions (body, validationResult) from express-validator for input validation
const { body, validationResult } = require('express-validator');
// Imports sanitize-html library to prevent XSS attacks by cleaning HTML input
const sanitizeHtml = require('sanitize-html');

// --- EXPRESS APP INITIALIZATION ---

// Initializes the Express application instance
const app = express(); // <- IMPORTANT: 'app' must be defined before configuring it with app.use/app.set


// --- CONFIGURATION FROM ENVIRONMENT VARIABLES ---
// Sets the server port, preferring process.env.PORT (from .env or hosting) or defaulting to 3000
const PORT = process.env.PORT || 3000;
// Sets the MongoDB connection URI, preferring process.env.MONGODB_URI or defaulting to a local instance
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigconnect';

// EJS TEMPLATING ENGINE SETUP

// Tells Express to use 'ejs' as the view engine for rendering templates
app.set('view engine', 'ejs');
// Configures Express to find view files (EJS templates) in the 'views' directory
app.set('views', path.join(__dirname, 'views'));
// Activates the express-ejs-layouts middleware
app.use(expressLayouts);
// Sets the default layout file for all EJS views to 'views/layouts/main.ejs'
app.set('layout', 'layouts/main');

// --- DATABASE CONNECTION ---

// Connects to the MongoDB database using the MONGODB_URI
mongoose.connect(MONGODB_URI)
  // If connection is successful, logs a success message to the console
  .then(() => console.log('MongoDB connected successfully'))
  // If connection fails, logs an error message to the console
  .catch(err => console.error('MongoDB connection error:', err));

// --- MIDDLEWARE SETUP ---

// Middleware to parse incoming request bodies with JSON payloads (e.g., from API requests)
app.use(express.json());
// Middleware to parse incoming request bodies with URL-encoded payloads (e.g., from HTML forms)
// 'extended: true' allows for rich objects and arrays in the URL-encoded data
app.use(express.urlencoded({ extended: true }));
// Middleware to serve static files (HTML, CSS, JS, images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE MODELS IMPORTS ---

// Imports the 'Worker' Mongoose model from the local 'models/workers.js' file
const Worker = require('./models/workers');

// ===========================
//       EJS RENDERING ROUTES
// ===========================
// Defines a GET route for the root URL ('/')
app.get('/', (req, res) => res.render('index', { title: 'GigConnect — Home' }));
// Defines a GET route for '/howitworks'
app.get('/howitworks', (req, res) => res.render('howitworks', { title: 'How GigConnect Works' }));
// Defines a GET route for '/findHelpNow'
app.get('/findHelpNow', (req, res) => res.render('findHelpNow', { title: 'Find Help' }));
// Defines a GET route for '/contactus'
app.get('/contactus', (req, res) => res.render('contactus', { title: 'Contact Us' }));
// Defines a GET route for '/signup'
app.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up' }));
// Defines a GET route for '/clientlogin'
app.get('/clientlogin', (req, res) => res.render('clientlogin', { title: 'Client Login' }));
// Defines a GET route for '/professionallogin'
app.get('/professionallogin', (req, res) => res.render('professionallogin', { title: 'Professional Login' }));
// Defines a GET route for '/register'
app.get('/register', (req, res) => res.render('register', { title: 'Register as Professional' }));

// ===========================
//     YOUR API ROUTES
// ===========================

// --- HELPER FUNCTION: Regex Escaping ---
// Prevents Regular Expression Injection by escaping special characters
function escapeRegex(text = '') {
  // Replaces any special regex character with itself preceded by a backslash
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- API ROUTE: GET /api/workers (Read/Search Workers) ---
// Defines an asynchronous GET route to fetch workers, supporting search filters
app.get('/api/workers', async (req, res) => {
  try {
    // Extracts and trims 'skill' query parameter, defaults to null if not present
    const skillQ = req.query.skill?.trim() || null;
    // Extracts and trims 'city' query parameter, defaults to null
    const cityQ  = req.query.city?.trim() || null;
    // Extracts and trims 'name' query parameter, defaults to null
    const nameQ  = req.query.name?.trim() || null;

    // Array to hold MongoDB query clauses that must ALL be true ($and)
    const andClauses = [];

    // If a city query is provided
    if (cityQ) {
      // Escapes the city query string for safe use in a regular expression
      const escapedCity = escapeRegex(cityQ);
      // Adds a clause to match the 'city' field exactly (case-insensitive, ignoring surrounding whitespace)
      andClauses.push({ city: { $regex: `^\\s*${escapedCity}\\s*$`, $options: 'i' } });
    }

    // Array to hold MongoDB query clauses where AT LEAST ONE must be true ($or)
    const orClauses = [];
    // If a name query is provided, adds a regex match for the 'name' field (case-insensitive)
    if (nameQ) orClauses.push({ name: { $regex: nameQ, $options: 'i' } });
    // If a skill query is provided, adds a match for elements within the 'skills' array (case-insensitive)
    if (skillQ) orClauses.push({ skills: { $elemMatch: { $regex: skillQ, $options: 'i' } } });
    // If any 'or' clauses were added, group them under a single $or operator and add to $andClauses
    if (orClauses.length) andClauses.push({ $or: orClauses });

    // Constructs the final MongoDB query: use $and if clauses exist, else an empty object (find all)
    const finalQuery = andClauses.length ? { $and: andClauses } : {};
    // Executes the query, returns plain JavaScript objects (.lean()), and excludes the '__v' field
    const workers = await Worker.find(finalQuery).lean().select('-__v');

    // Sends the fetched workers as a JSON array in the response
    res.json(workers);
  } catch (err) {
    // Logs any errors that occur during the fetch operation
    console.error('GET /api/workers error:', err);
    // Sends a 500 Internal Server Error response
    res.status(500).json({ message: 'Error fetching workers' });
  }
});

// --- API ROUTE: POST /api/workers (Create Worker) ---
// Defines validation rules for the worker creation request body
const workerValidators = [
  // 'name' must be a string, trimmed, and between 2 and 100 characters long
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  // 'city' must be a string, trimmed, and between 2 and 100 characters long
  body('city').isString().trim().isLength({ min: 2, max: 100 }),
  // Custom validation for 'skills': must be an array OR a non-empty string
  body('skills').custom(v => {
    if (Array.isArray(v)) return true; // Valid if it's an array
    if (typeof v === "string" && v.trim().length > 0) return true; // Valid if it's a non-empty string
    throw new Error("skills required"); // Otherwise, throw an error
  }),
  // 'experience' must be an integer between 0 and 100
  body('experience').isInt({ min: 0, max: 100 })
];

// Defines an asynchronous POST route to create a new worker, applying validation and sanitization
app.post('/api/workers', workerValidators, async (req, res) => {
  // Collects validation errors from express-validator
  const errors = validationResult(req);
  // If there are validation errors, send a 422 status and the error details
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    // --- INPUT NORMALIZATION AND SANITIZATION ---
    // Safely retrieves raw input values, defaulting to empty string
    const rawName = req.body.name || '';
    const rawCity = req.body.city || '';
    const rawContact = req.body.contact || '';

    // Sanitizes name: converts to string, trims, removes HTML tags/attributes
    const name = sanitizeHtml(String(rawName).trim(), { allowedTags: [], allowedAttributes: {} });
    // Sanitizes city: converts to string, trims, removes HTML tags/attributes, and converts to lowercase
    const city = sanitizeHtml(String(rawCity).trim(), { allowedTags: [], allowedAttributes: {} }).toLowerCase();
    // Trims contact string (no HTML sanitization needed if it's just text like email/phone)
    const contact = String(rawContact).trim();

    // Processes 'skills': if already array, use it; otherwise, split comma-separated string, trim, lowercase
    let skillsArr = Array.isArray(req.body.skills)
      ? req.body.skills
      : String(req.body.skills).split(',').map(s => s.trim().toLowerCase());

    // Filters out any empty strings that might result from splitting (e.g., "skill1,,skill2")
    skillsArr = skillsArr.filter(Boolean); // Boolean() acts as a truthy check for each element

    // Additional validation: if no skills remain after processing, return 422 error
    if (!skillsArr.length) return res.status(422).json({ message: 'At least one skill required' });

    // Converts experience to a number, defaults to 0 if not valid
    const experience = Number(req.body.experience) || 0;
    // Converts ratings to a number, allows 0 explicitly, defaults to 0 if undefined
    const ratings = req.body.ratings !== undefined ? Number(req.body.ratings) : 0;
    // Converts distance to a number, allows 0 explicitly, defaults to 0 if undefined
    const distance = req.body.distance !== undefined ? Number(req.body.distance) : 0;
    // Sets photo URL, trims it, defaults to undefined if not provided
    const photo = req.body.photo ? String(req.body.photo).trim() : undefined;
    // Sanitizes description if provided, otherwise undefined
    const description = req.body.description ? sanitizeHtml(String(req.body.description), { allowedTags: [], allowedAttributes: {} }) : undefined;

    // The following lines are commented out, indicating optional or future features:
    // const hourlyRate = req.body.hourlyRate !== undefined ? Number(req.body.hourlyRate) : undefined;
    // let portfolio = [];
    // if (Array.isArray(req.body.portfolio)) {
    //   portfolio = req.body.portfolio.map(u => String(u).trim()).filter(Boolean);
    // } else if (req.body.portfolio && typeof req.body.portfolio === 'string') {
    //   portfolio = req.body.portfolio.split(',').map(u => u.trim()).filter(Boolean);
    // }

    // --- DATABASE OPERATION: CREATE WORKER ---
    // Creates a new worker document in MongoDB with the processed data
    const worker = await Worker.create({
      name,         // Uses the sanitized name
      contact,      // Uses the trimmed contact
      city,         // Uses the sanitized and lowercased city
      skills: skillsArr, // Uses the processed array of skills
      experience,   // Uses the numeric experience
      ratings,      // Uses the numeric ratings
      distance,     // Uses the numeric distance
      photo,        // Uses the photo URL or undefined
      description   // Uses the sanitized description or undefined
    });

    // --- RESPONSE ---
    // Sends a 201 Created status and the newly created worker object as JSON
    res.status(201).json(worker);
  } catch (e) {
    // Logs any errors that occur during worker creation
    console.error('POST /api/workers error:', e);
    // --- ERROR HANDLING ---
    // Checks for MongoDB duplicate key error (error code 11000)
    if (e && e.code === 11000) return res.status(409).json({ message: 'Duplicate key error' }); // Sends 409 Conflict
    // For any other errors, sends a 500 Internal Server Error response
    res.status(500).json({ message: "Error creating worker" });
  }
});

// ---- SERVER START ----
// Starts the Express server, making it listen for requests on the defined PORT
app.listen(PORT, () => {
  // Logs a message to the console indicating the server is running and its URL
  console.log(`Server running at http://localhost:${PORT}`);
});















// require('dotenv').config();

// const express = require('express');
// const mongoose = require('mongoose');
// const path = require('path');
// const expressLayouts = require('express-ejs-layouts');
// const { body, validationResult } = require('express-validator');
// const sanitizeHtml = require('sanitize-html');

// const app = express(); // <- MUST exist before app.use / app.set

// // Reading env file
// const PORT = process.env.PORT || 3000;
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigconnect';

// //setting up ejs
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));
// app.use(expressLayouts);
// app.set('layout', 'layouts/main');

// //connecting with mongo
// mongoose.connect(MONGODB_URI)
//   .then(() => console.log('MongoDB connected successfully'))
//   .catch(err => console.error('MongoDB connection error:', err));

// //middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'public')));

// // ---- MODELS ----
// const Worker = require('./models/workers');

// //ejs routes
// app.get('/', (req, res) => res.render('index', { title: 'GigConnect — Home' }));
// app.get('/howitworks', (req, res) => res.render('howitworks', { title: 'How GigConnect Works' }));
// app.get('/findHelpNow', (req, res) => res.render('findHelpNow', { title: 'Find Help' }));
// app.get('/contactus', (req, res) => res.render('contactus', { title: 'Contact Us' }));
// app.get('/signup', (req, res) => res.render('signup', { title: 'Sign Up' }));
// app.get('/clientlogin', (req, res) => res.render('clientlogin', { title: 'Client Login' }));
// app.get('/professionallogin', (req, res) => res.render('professionallogin', { title: 'Professional Login' }));
// app.get('/register', (req, res) => res.render('register', { title: 'Register as Professional' }));

// // ===========================
// //     YOUR API ROUTES
// // ===========================n

// // escape helper (prevents regexp injection)
// function escapeRegex(text = '') {
//   return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

// // GET /api/workers - read/search workers
// app.get('/api/workers', async (req, res) => {
//   try {
//     const skillQ = req.query.skill?.trim() || null;
//     const cityQ  = req.query.city?.trim() || null;
//     const nameQ  = req.query.name?.trim() || null;

//     const andClauses = [];

//     if (cityQ) {
//       const escapedCity = escapeRegex(cityQ);
//       andClauses.push({ city: { $regex: `^\\s*${escapedCity}\\s*$`, $options: 'i' } });
//     }

//     const orClauses = [];
//     if (nameQ) orClauses.push({ name: { $regex: nameQ, $options: 'i' } });
//     if (skillQ) orClauses.push({ skills: { $elemMatch: { $regex: skillQ, $options: 'i' } } });
//     if (orClauses.length) andClauses.push({ $or: orClauses });

//     const finalQuery = andClauses.length ? { $and: andClauses } : {};
//     const workers = await Worker.find(finalQuery).lean().select('-__v');

//     res.json(workers);
//   } catch (err) {
//     console.error('GET /api/workers error:', err);
//     res.status(500).json({ message: 'Error fetching workers' });
//   }
// });

// // POST /api/workers - create worker (validation + sanitization)
// const workerValidators = [
//   body('name').isString().trim().isLength({ min: 2, max: 100 }),
//   body('city').isString().trim().isLength({ min: 2, max: 100 }),
//   body('skills').custom(v => {
//     if (Array.isArray(v)) return true;
//     if (typeof v === "string" && v.trim().length > 0) return true;
//     throw new Error("skills required");
//   }),
//   body('experience').isInt({ min: 0, max: 100 })
// ];

// app.post('/api/workers', workerValidators, async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

//   try {
//     // Normalize and sanitize inputs
//     const rawName = req.body.name || '';
//     const rawCity = req.body.city || '';
//     const rawContact = req.body.contact || '';

//     const name = sanitizeHtml(String(rawName).trim(), { allowedTags: [], allowedAttributes: {} });
//     const city = sanitizeHtml(String(rawCity).trim(), { allowedTags: [], allowedAttributes: {} }).toLowerCase();
//     const contact = String(rawContact).trim();

//     let skillsArr = Array.isArray(req.body.skills)
//       ? req.body.skills
//       : String(req.body.skills).split(',').map(s => s.trim().toLowerCase());

//     skillsArr = skillsArr.filter(Boolean);

//     if (!skillsArr.length) return res.status(422).json({ message: 'At least one skill required' });

//     const experience = Number(req.body.experience) || 0;
//     const ratings = req.body.ratings !== undefined ? Number(req.body.ratings) : 0;
//     const distance = req.body.distance !== undefined ? Number(req.body.distance) : 0;
//     const photo = req.body.photo ? String(req.body.photo).trim() : undefined;
//     const description = req.body.description ? sanitizeHtml(String(req.body.description), { allowedTags: [], allowedAttributes: {} }) : undefined;
// // const hourlyRate = req.body.hourlyRate !== undefined ? Number(req.body.hourlyRate) : undefined;
// //     let portfolio = [];
// //     if (Array.isArray(req.body.portfolio)) {
// //       portfolio = req.body.portfolio.map(u => String(u).trim()).filter(Boolean);
// //     } else if (req.body.portfolio && typeof req.body.portfolio === 'string') {
// //       portfolio = req.body.portfolio.split(',').map(u => u.trim()).filter(Boolean);
// //     }

//     const worker = await Worker.create({
//       name,
//       contact,
//       city,
//       skills: skillsArr,
//       experience,
//       ratings,
//       distance,
//       photo,
//       description
//     });

//     res.status(201).json(worker);
//   } catch (e) {
//     console.error('POST /api/workers error:', e);
//     // duplicate key handling (e.g., unique contact)
//     if (e && e.code === 11000) return res.status(409).json({ message: 'Duplicate key error' });
//     res.status(500).json({ message: "Error creating worker" });
//   }
// });

// // ---- START SERVER ----
// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });
