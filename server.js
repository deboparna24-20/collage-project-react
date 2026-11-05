// ============================================================================
// Estorvix Real Estate - Node.js & Express.js Backend Server
// Integrates with MySQL database (mysql2) and Vite frontend middleware
// ============================================================================

import express from 'express';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import {
  initDb,
  closeDb,
  getProperties,
  getPropertyById,
  createProperty,
  getInquiries,
  createInquiry,
  updateInquiryStatus,
  INQUIRY_STATUS_OPTIONS,
  normalizeInquiryStatus,
  getDbStatus,
  getAdminDashboardData,
  getAdminProperties,
  updateProperty,
  deleteProperty,
  getAdminInquiries,
  updateAdminInquiryStatus,
  deleteInquiry
} from './server/db.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, 'uploads');

const app = express();
const DEFAULT_PORT = 3000;
const requestedPort = Number(process.env.PORT) || DEFAULT_PORT;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDirectory, {
  dotfiles: 'deny',
  index: false,
  maxAge: '7d',
  immutable: true
}));

// Request logger for API calls
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ----------------------------------------------------------------------------
// REST API Endpoints
// ----------------------------------------------------------------------------

/**
 * GET /api/db/status - Database health check and configuration info
 */
app.get('/api/db/status', async (req, res) => {
  try {
    const status = getDbStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats - High level statistics for properties and inquiries
 */
app.get('/api/stats', async (req, res) => {
  try {
    const properties = await getProperties();
    const inquiries = await getInquiries();

    const forSale = properties.filter(p => p.status === 'For Sale').length;
    const forRent = properties.filter(p => p.status === 'For Rent').length;
    const totalValue = properties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const avgPrice = properties.length ? Math.round(totalValue / properties.length) : 0;

    res.json({
      totalProperties: properties.length,
      forSale,
      forRent,
      totalInquiries: inquiries.length,
      avgPrice,
      typesCount: properties.reduce((acc, p) => {
        acc[p.property_type] = (acc[p.property_type] || 0) + 1;
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute statistics' });
  }
});

/**
 * GET /api/properties - Retrieve properties with optional filters
 * Query params: search, location, type, minPrice, maxPrice, bedrooms, status, sort
 */
app.get('/api/properties', async (req, res) => {
  try {
    const { search, location, type, minPrice, maxPrice, bedrooms, status, sort } = req.query;
    const properties = await getProperties({
      search,
      location,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      status,
      sort
    });
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to retrieve properties' });
  }
});

/**
 * GET /api/properties/:id - Retrieve property details by ID
 */
app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await getPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (error) {
    console.error('Error fetching property by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve property details' });
  }
});

/**
 * POST /api/properties - Create a new property listing
 */
app.post('/api/properties', async (req, res) => {
  try {
    const { title, description, property_type, price, location, address } = req.body;
    
    if (!title || !description || !price || !location) {
      return res.status(400).json({
        error: 'Please provide all required fields: title, description, price, and location'
      });
    }

    const created = await createProperty(req.body);
    res.status(201).json({
      message: 'Property created successfully in database',
      property: created
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property in database' });
  }
});

/**
 * GET /api/inquiries - Retrieve all customer inquiries
 */
app.get('/api/inquiries', async (req, res) => {
  try {
    const inquiries = await getInquiries();
    res.json(inquiries);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    const status = error.statusCode === 503 ? 503 : 500;
    res.status(status).json({ error: status === 503 ? error.message : 'Failed to retrieve inquiries' });
  }
});

/**
 * POST /api/inquiries - Submit an inquiry for a property
 */
app.post('/api/inquiries', async (req, res) => {
  try {
    const { property_id, customer_name, customer_email, customer_phone, message } = req.body;

    const id = validId(property_id);
    if (!id || ![customer_name, customer_email, customer_phone, message].every((value) => typeof value === 'string' && value.trim())) {
      return res.status(400).json({
        error: 'Please fill all required fields: name, email, phone number, and inquiry message'
      });
    }
    if (customer_name.trim().length > 100 || customer_email.trim().length > 120 || customer_phone.trim().length > 40 || message.trim().length > 60000) {
      return res.status(400).json({ error: 'One or more inquiry fields exceed the allowed length.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email.trim())) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const created = await createInquiry({ ...req.body, property_id: id });
    res.status(201).json({
      message: 'Inquiry submitted successfully and recorded in database',
      inquiry: created
    });
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    const status = error.statusCode === 503 ? 503 : 500;
    res.status(status).json({ error: status === 503 ? error.message : 'Failed to submit inquiry' });
  }
});

/**
 * PATCH /api/inquiries/:id/status - Update inquiry status
 */
app.patch('/api/inquiries/:id/status', async (req, res) => {
  try {
    const id = validId(req.params.id);
    const status = canonicalInquiryStatus(req.body?.status);
    if (!id) return res.status(400).json({ error: 'Invalid inquiry ID.' });
    if (!status) return res.status(400).json({ error: 'Choose a valid inquiry status.' });
    const result = await updateInquiryStatus(id, status);
    if (!result.success) {
      return res.status(404).json({ error: result.error || 'Inquiry not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    const status = error.statusCode === 503 ? 503 : 500;
    res.status(status).json({ error: status === 503 ? error.message : 'Failed to update inquiry status' });
  }
});

function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function canonicalInquiryStatus(value) {
  if (typeof value !== 'string') return null;
  return INQUIRY_STATUS_OPTIONS.find((status) => status.toLowerCase() === value.trim().toLowerCase()) || null;
}

function validateProperty(body) {
  const property = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const limits = { title: 255, description: 60000, location: 100, address: 255 };
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof property[field] !== 'string' || !property[field].trim()) return { error: `${field} is required.` };
    if (property[field].trim().length > limit) return { error: `${field} must be ${limit} characters or fewer.` };
  }
  const propertyTypes = ['Apartment', 'Villa', 'Single Family Home', 'Studio', 'Penthouse', 'Townhouse'];
  if (!propertyTypes.includes(property.property_type)) return { error: 'Choose a valid property type.' };
  const statuses = ['Pending', 'Approved', 'Rejected', 'Sold', 'Rented'];
  if (!statuses.includes(property.status) && !['For Sale', 'For Rent'].includes(property.status)) return { error: 'Choose a valid listing status.' };

  const price = Number(property.price);
  if (!Number.isFinite(price) || price <= 0 || price > 9999999999.99) return { error: 'Enter a valid positive price.' };
  const numberFields = {
    bedrooms: [0, 100, 1],
    bathrooms: [0, 100, 1],
    area_sqft: [1, 10000000, 800],
    year_built: [1700, 2200, new Date().getFullYear()],
    parking_spaces: [0, 100, 0]
  };
  const numbers = {};
  for (const [field, [minimum, maximum, defaultValue]] of Object.entries(numberFields)) {
    const value = Number(property[field] ?? defaultValue);
    if (!Number.isInteger(value) || value < minimum || value > maximum) return { error: `Enter a valid ${field.replace('_', ' ')} value.` };
    numbers[field] = value;
  }

  const imageUrl = typeof property.image_url === 'string' ? property.image_url.trim() : '';
  const isUploadedImage = /^\/uploads\/[a-zA-Z0-9._-]+$/.test(imageUrl);
  let validRemoteImage = false;
  try {
    const parsedUrl = new URL(imageUrl);
    validRemoteImage = parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch {
    validRemoteImage = false;
  }
  if ((!validRemoteImage && !isUploadedImage) || imageUrl.length > 500) {
    return { error: 'Provide a valid image URL or upload an image.' };
  }
  for (const field of ['agent_name', 'agent_phone', 'agent_email', 'amenities']) {
    if (property[field] != null && typeof property[field] !== 'string') return { error: `${field} must be text.` };
  }
  if (property.agent_name?.length > 100 || property.agent_phone?.length > 40 || property.agent_email?.length > 100) {
    return { error: 'Agent details exceed the allowed length.' };
  }
  if (property.agent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(property.agent_email)) {
    return { error: 'Enter a valid agent email address.' };
  }
  if (property.featured != null && ![true, false, 0, 1].includes(property.featured)) {
    return { error: 'Featured must be a boolean value.' };
  }
  if (property.images != null && !Array.isArray(property.images) && typeof property.images !== 'string') {
    return { error: 'Property gallery images must be a list or JSON string.' };
  }
  const images = Array.isArray(property.images) ? JSON.stringify(property.images) : (property.images || '[]');
  if (images.length > 10000) return { error: 'Property gallery data is too large.' };

  const normalizedStatus = ['For Sale', 'For Rent'].includes(property.status) ? 'Approved' : (property.status || 'Pending');
  return {
    value: {
      title: property.title.trim(),
      description: property.description.trim(),
      property_type: property.property_type,
      price,
      location: property.location.trim(),
      address: property.address.trim(),
      ...numbers,
      status: normalizedStatus,
      featured: property.featured === true || property.featured === 1 ? 1 : 0,
      image_url: imageUrl,
      images,
      amenities: property.amenities?.trim() || '',
      agent_name: property.agent_name?.trim() || 'Estorvix Advisory',
      agent_phone: property.agent_phone?.trim() || '+1 (555) 782-9012',
      agent_email: property.agent_email?.trim() || 'advisory@estorvix.com',
      rejection_reason: typeof property.rejection_reason === 'string' ? property.rejection_reason.trim().slice(0, 500) : null
    }
  };
}

function handleAdminError(res, error, message) {
  console.error(`[Estorvix Admin] ${message}:`, error);
  const status = error.statusCode === 503 ? 503 : 500;
  return res.status(status).json({ error: status === 503 ? error.message : message });
}

app.use('/api/admin', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    res.json(await getAdminDashboardData());
  } catch (error) {
    handleAdminError(res, error, 'Failed to load dashboard data.');
  }
});

app.get('/api/admin/properties', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'All';
  const type = typeof req.query.type === 'string' ? req.query.type : 'All';
  if (!['All', 'Pending', 'Approved', 'Rejected', 'Sold', 'Rented', 'For Sale', 'For Rent'].includes(status)) {
    return res.status(400).json({ error: 'Choose a valid property status.' });
  }
  if (!['All', 'Apartment', 'Villa', 'Single Family Home', 'Studio', 'Penthouse', 'Townhouse'].includes(type)) {
    return res.status(400).json({ error: 'Choose a valid property type.' });
  }
  if (typeof req.query.search === 'string' && req.query.search.length > 200) {
    return res.status(400).json({ error: 'Search must be 200 characters or fewer.' });
  }
  try {
    const properties = await getAdminProperties({
      search: typeof req.query.search === 'string' ? req.query.search : '',
      status,
      type
    });
    res.json(properties);
  } catch (error) {
    handleAdminError(res, error, 'Failed to load properties.');
  }
});

app.post('/api/admin/properties', async (req, res) => {
  const validated = validateProperty(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });
  try {
    const property = await createProperty(validated.value, { requireMysql: true });
    res.status(201).json({ property });
  } catch (error) {
    handleAdminError(res, error, 'Failed to create property.');
  }
});

app.put('/api/admin/properties/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid property ID.' });
  const validated = validateProperty(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });
  try {
    const property = await updateProperty(id, validated.value);
    if (!property) return res.status(404).json({ error: 'Property not found.' });
    res.json({ property });
  } catch (error) {
    handleAdminError(res, error, 'Failed to update property.');
  }
});

app.delete('/api/admin/properties/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid property ID.' });
  try {
    if (!await deleteProperty(id)) return res.status(404).json({ error: 'Property not found.' });
    res.status(204).end();
  } catch (error) {
    handleAdminError(res, error, 'Failed to delete property.');
  }
});

app.post('/api/admin/uploads', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.' });
  const { buffer } = req.file;
  let extension;
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) extension = '.jpg';
  else if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) extension = '.png';
  else if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') extension = '.webp';
  if (!extension) return res.status(400).json({ error: 'Only valid JPEG, PNG, or WebP images are allowed.' });

  try {
    await mkdir(uploadsDirectory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(path.join(uploadsDirectory, filename), buffer, { flag: 'wx' });
    res.status(201).json({ image_url: `/uploads/${filename}` });
  } catch (error) {
    handleAdminError(res, error, 'Failed to save uploaded image.');
  }
});

app.get('/api/admin/inquiries', async (req, res) => {
  const rawStatus = typeof req.query.status === 'string' ? req.query.status.trim() : 'All';
  const requestedStatus = rawStatus.toLowerCase() === 'all' ? 'All' : canonicalInquiryStatus(rawStatus);
  if (!requestedStatus) {
    return res.status(400).json({ error: 'Choose a valid inquiry status.' });
  }
  if (typeof req.query.search === 'string' && req.query.search.length > 200) {
    return res.status(400).json({ error: 'Search must be 200 characters or fewer.' });
  }
  try {
    const inquiries = await getAdminInquiries({
      search: typeof req.query.search === 'string' ? req.query.search : '',
      status: requestedStatus
    });
    res.json(inquiries);
  } catch (error) {
    handleAdminError(res, error, 'Failed to load inquiries.');
  }
});

app.patch('/api/admin/inquiries/:id/status', async (req, res) => {
  const id = validId(req.params.id);
  const requestedStatus = canonicalInquiryStatus(req.body?.status);
  if (!id) return res.status(400).json({ error: 'Invalid inquiry ID.' });
  if (!requestedStatus) return res.status(400).json({ error: 'Choose a valid inquiry status.' });
  try {
    if (!await updateAdminInquiryStatus(id, requestedStatus)) return res.status(404).json({ error: 'Inquiry not found.' });
    res.json({ id, status: requestedStatus });
  } catch (error) {
    handleAdminError(res, error, 'Failed to update inquiry.');
  }
});

app.delete('/api/admin/inquiries/:id', async (req, res) => {
  const id = validId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid inquiry ID.' });
  try {
    if (!await deleteInquiry(id)) return res.status(404).json({ error: 'Inquiry not found.' });
    res.status(204).end();
  } catch (error) {
    handleAdminError(res, error, 'Failed to delete inquiry.');
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      error: error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller.' : 'Invalid image upload.'
    });
  }
  console.error('[Estorvix Server] Unhandled request error:', error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

// ----------------------------------------------------------------------------
// Vite Dev Server Integration & Static Serving
// ----------------------------------------------------------------------------

async function getAvailablePort(startingPort, maxAttempts = 20) {
  let port = Number.isInteger(startingPort) && startingPort > 0 ? startingPort : DEFAULT_PORT;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const probe = createNetServer();
    const isAvailable = await new Promise((resolve) => {
      probe.once('error', () => resolve(false));
      probe.listen(port, '0.0.0.0', () => {
        probe.close(() => resolve(true));
      });
    });

    if (isAvailable) {
      return port;
    }

    port += 1;
  }

  throw new Error(`No free port found starting from ${startingPort}.`);
}

async function startServer() {
  // Attempt initial MySQL connection
  await initDb();

  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = await getAvailablePort(requestedPort);
  const httpServer = createServer(app);
  let vite;

  try {
    if (!isProduction) {
      const { createServer: createViteServer } = await import('vite');
      const hmrEnabled = process.env.DISABLE_HMR !== 'true';
      vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: hmrEnabled,
          ws: hmrEnabled ? { server: httpServer } : false,
        },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(path.resolve(__dirname, 'dist')));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
      });
    }

    await new Promise((resolve, reject) => {
      const onError = (error) => reject(error);
      httpServer.once('error', onError);
      httpServer.listen(PORT, '0.0.0.0', () => {
        httpServer.removeListener('error', onError);
        resolve();
      });
    });

    if (PORT !== requestedPort) {
      console.warn(`[Estorvix Server] Port ${requestedPort} was busy. Using ${PORT} instead.`);
    }
    console.log(`[Estorvix Server] Server running on http://localhost:${PORT}`);

    const shutdown = async () => {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => error ? reject(error) : resolve());
      });
      if (vite) await vite.close();
      await closeDb();
    };
    process.once('SIGINT', () => {
      shutdown().catch((error) => console.error('[Estorvix Server] Shutdown error:', error));
    });
    process.once('SIGTERM', () => {
      shutdown().catch((error) => console.error('[Estorvix Server] Shutdown error:', error));
    });
  } catch (error) {
    if (vite) await vite.close();
    await closeDb();
    throw error;
  }
}

startServer().catch((err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Estorvix Server] Port ${PORT} is already in use. Stop the other server process or select another port (PowerShell: $env:PORT=3001; npm run dev).`);
  } else {
    console.error('[Estorvix Server] Critical startup error:', err);
  }
  process.exitCode = 1;
});
