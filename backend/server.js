const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Custom .env file parser helper
const ENV_PATH = path.join(__dirname, '.env');
if (fs.existsSync(ENV_PATH)) {
  try {
    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
    console.log('Successfully loaded environmental variables from .env file');
  } catch (err) {
    console.error('Failed to parse .env file:', err);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json());

// Helper function to hash passwords
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Helper function to read from DB
const readDB = () => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const initialData = { users: [], profiles: {}, transactions: [], budgets: [], savings: [], futurePlans: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(raw);
    
    // Ensure all collections exist
    if (!data.users) data.users = [];
    if (!data.profiles) data.profiles = {};
    if (!data.transactions) data.transactions = [];
    if (!data.budgets) data.budgets = [];
    if (!data.savings) data.savings = [];
    if (!data.futurePlans) data.futurePlans = [];
    
    return data;
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], profiles: {}, transactions: [], budgets: [], savings: [], futurePlans: [] };
  }
};

// Helper function to write to DB
const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to database:', error);
    return false;
  }
};

// In-memory mock mail server queue
const mockEmails = [];

// Initialize SMTP Transporter if variables are configured
let transporter = null;
if (process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_APP_PASSWORD)) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
  
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  console.log(`Email server configured: Sending via ${smtpHost} (${smtpUser})`);
} else {
  console.log('Email server NOT configured. Falling back to local Mock Mail Server.');
}

// -------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// Get mock mail logs (for development and local testing OTP retrieval)
app.get('/api/auth/mock-emails', (req, res) => {
  res.json(mockEmails);
});

// Register a new user
// Register a new user
app.post('/api/auth/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Username, password, and email are required' });
  }

  const db = readDB();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  
  const userExists = db.users.some(u => u.username.toLowerCase() === normalizedUsername);
  if (userExists) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  const emailExists = db.users.some(u => u.email && u.email.toLowerCase() === normalizedEmail);
  if (emailExists) {
    return res.status(400).json({ error: 'Email address is already registered' });
  }

  const verificationOtp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes in milliseconds
  const newUserId = `u_${Date.now()}`;
  
  const newUser = {
    id: newUserId,
    username: username.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    isVerified: false,
    verificationCode: verificationOtp,
    otpExpiry: otpExpiry,
    admin: false
  };

  db.users.push(newUser);

  // Initialize empty profile
  db.profiles[newUserId] = {
    initialized: false,
    currentBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    targetSavings: 0
  };

  // Seed default categories
  const defaultCategories = ['Food', 'Rent', 'Entertainment', 'Utilities'];
  defaultCategories.forEach(cat => {
    db.budgets.push({
      userId: newUserId,
      category: cat,
      limit: cat === 'Rent' ? 15000 : (cat === 'Food' ? 5000 : 2500)
    });
  });

  // Send real verification email if transporter is configured
  if (transporter) {
    const mailOptions = {
      from: `"FinFlow" <${process.env.SMTP_USER}>`,
      to: newUser.email,
      subject: 'Verify your FinFlow Account - OTP Code',
      text: `Hi ${newUser.username},\n\nThank you for choosing FinFlow! Your account has been created.\n\nHere is your 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code is valid for 5 minutes. Please enter it in the app to verify your account.\n\nBest regards,\nThe FinFlow Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Failed to send verification email via SMTP:', error);
      } else {
        console.log(`Verification email successfully sent to ${newUser.email}: ${info.messageId}`);
      }
    });
  }

  // Add to local mockEmails queue as developer fallback
  mockEmails.unshift({
    id: `mail_${Date.now()}`,
    to: newUser.email,
    subject: 'Verify your FinFlow Account - OTP Code (Simulated)',
    body: `Hi ${newUser.username},\n\nHere is your 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code will expire in 5 minutes.\n\nThis is a simulated verification email for local development.`,
    date: new Date().toISOString()
  });

  writeDB(db);
  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    needsVerification: true,
    admin: false
  });
});

// Verify OTP
app.post('/api/auth/verify', (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) {
    return res.status(400).json({ error: 'User ID and verification OTP code are required' });
  }

  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = db.users[userIndex];
  
  // Verify expiration
  if (user.otpExpiry && Date.now() > user.otpExpiry) {
    return res.status(400).json({ error: 'Verification OTP code has expired. Please request a new one.' });
  }

  if (user.verificationCode !== code.trim()) {
    return res.status(400).json({ error: 'Invalid verification OTP code. Please try again.' });
  }

  user.isVerified = true;
  user.verificationCode = null;
  user.otpExpiry = null;
  writeDB(db);

  res.json({ userId: user.id, username: user.username, email: user.email, admin: !!user.admin });
});

// Resend OTP
app.post('/api/auth/resend', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.isVerified) {
    return res.status(400).json({ error: 'Account is already verified' });
  }

  const verificationOtp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  user.verificationCode = verificationOtp;
  user.otpExpiry = otpExpiry;
  writeDB(db);

  if (transporter) {
    const mailOptions = {
      from: `"FinFlow" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Verify your FinFlow Account - OTP Code',
      text: `Hi ${user.username},\n\nHere is your new 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code is valid for 5 minutes. Please enter it to verify your account.\n\nBest regards,\nThe FinFlow Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Failed to send verification email via SMTP (resend):', error);
      } else {
        console.log(`Verification email successfully resent to ${user.email}: ${info.messageId}`);
      }
    });
  }

  mockEmails.unshift({
    id: `mail_${Date.now()}`,
    to: user.email,
    subject: 'Verify your FinFlow Account - OTP Code (Simulated Resend)',
    body: `Hi ${user.username},\n\nHere is your new 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code will expire in 5 minutes.\n\nThis is a simulated verification email for local development.`,
    date: new Date().toISOString()
  });

  res.json({ success: true, message: 'Verification OTP has been resent.' });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = readDB();
  const identifier = username.trim().toLowerCase();
  const user = db.users.find(u => 
    u.username.toLowerCase() === identifier || 
    (u.email && u.email.toLowerCase() === identifier)
  );

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (user.isVerified === false) {
    // If not verified, trigger OTP re-dispatch and redirect
    const verificationOtp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.verificationCode = verificationOtp;
    user.otpExpiry = otpExpiry;
    
    if (transporter) {
      const mailOptions = {
        from: `"FinFlow" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Verify your FinFlow Account - OTP Code',
        text: `Hi ${user.username},\n\nHere is your new 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code is valid for 5 minutes. Please enter it to verify your account.\n\nBest regards,\nThe FinFlow Team`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Failed to send verification email via SMTP (login):', error);
        } else {
          console.log(`Verification email successfully sent to ${user.email}: ${info.messageId}`);
        }
      });
    }

    mockEmails.unshift({
      id: `mail_${Date.now()}`,
      to: user.email,
      subject: 'Verify your FinFlow Account (Re-sent)',
      body: `Hi ${user.username},\n\nHere is your new 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code will expire in 5 minutes.\n\nThis is a simulated verification email for local development.`,
      date: new Date().toISOString()
    });
    
    writeDB(db);
    return res.status(403).json({ 
      error: 'Account email is not verified.', 
      needsVerification: true, 
      userId: user.id 
    });
  }

  res.json({ id: user.id, userId: user.id, username: user.username, email: user.email, admin: !!user.admin });
});

// Change Password (Authenticated)
app.post('/api/auth/change-password', (req, res) => {
  // Check auth header directly since app.use requireAuth is registered below
  const userId = req.headers['x-user-id'];
  const { oldPassword, newPassword } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing session credentials' });
  }
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = db.users[userIndex];
  if (user.passwordHash !== hashPassword(oldPassword)) {
    return res.status(400).json({ error: 'Incorrect old password' });
  }

  user.passwordHash = hashPassword(newPassword);
  writeDB(db);
  res.json({ success: true, message: 'Password updated successfully' });
});

// -------------------------------------------------------------
// AUTH AUTHENTICATED MIDDLEWARE
// -------------------------------------------------------------
const requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing session credential header' });
  }
  req.userId = userId;
  next();
};

// Apply auth middleware to all routes below
app.use('/api/transactions', requireAuth);
app.use('/api/budgets', requireAuth);
app.use('/api/savings', requireAuth);
app.use('/api/profile', requireAuth);
app.use('/api/plans', requireAuth);
app.use('/api/summary', requireAuth);

// -------------------------------------------------------------
// USER PROFILE / DATA RESET ENDPOINTS
// -------------------------------------------------------------

// Get profile
app.get('/api/profile', (req, res) => {
  const db = readDB();
  const profile = db.profiles[req.userId] || {
    initialized: false,
    currentBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    targetSavings: 0
  };
  res.json(profile);
});

// Update profile and category budgets
app.post('/api/profile', (req, res) => {
  const { currentBalance, monthlyIncome, targetSavings, budgets } = req.body;
  
  if (currentBalance === undefined || monthlyIncome === undefined || targetSavings === undefined || !budgets) {
    return res.status(400).json({ error: 'Missing required profile configuration fields' });
  }

  const db = readDB();
  const newBalance = parseFloat(currentBalance);
  
  // Calculate if it's the first time
  const currentProfile = db.profiles[req.userId] || { initialized: false };
  const isFirstTime = !currentProfile.initialized;

  if (isFirstTime) {
    // Calculate total initial spent to adjust starting income transaction
    const totalInitialSpent = budgets.reduce((sum, b) => {
      return sum + (b.spent ? parseFloat(b.spent) : 0);
    }, 0);

    // Initial balance injection (adjusted so net balance equals entered balance after spent cuts)
    db.transactions.push({
      id: `t_init_${Date.now()}`,
      userId: req.userId,
      description: 'Initial Balance',
      amount: newBalance + totalInitialSpent,
      category: 'Other',
      type: 'income',
      date: new Date().toISOString().split('T')[0]
    });
  } else {
    // Adjustment calculations
    const prevBalance = currentProfile.currentBalance || 0;
    const diff = newBalance - prevBalance;

    if (diff !== 0) {
      db.transactions.push({
        id: `t_adj_${Date.now()}`,
        userId: req.userId,
        description: 'Balance Adjustment',
        amount: Math.abs(diff),
        category: 'Other',
        type: diff > 0 ? 'income' : 'expense',
        date: new Date().toISOString().split('T')[0]
      });
    }
  }

  // Overwrite user budgets
  // Clean old budgets for this user first
  db.budgets = db.budgets.filter(b => b.userId !== req.userId);
  budgets.forEach((b, index) => {
    db.budgets.push({
      userId: req.userId,
      category: b.category,
      limit: parseFloat(b.limit)
    });

    // Check if starting spent value is passed for this category (on first time setup)
    if (isFirstTime && b.spent && parseFloat(b.spent) > 0) {
      db.transactions.push({
        id: `t_init_spent_${b.category}_${Date.now()}_${index}`,
        userId: req.userId,
        description: `Starting Spend: ${b.category}`,
        amount: parseFloat(b.spent),
        category: b.category,
        type: 'expense',
        date: new Date().toISOString().split('T')[0]
      });
    }
  });

  const calculatedExpenses = budgets.reduce((sum, b) => sum + parseFloat(b.limit), 0);

  db.profiles[req.userId] = {
    initialized: true,
    currentBalance: newBalance,
    monthlyIncome: parseFloat(monthlyIncome),
    monthlyExpenses: calculatedExpenses,
    targetSavings: parseFloat(targetSavings)
  };

  writeDB(db);
  res.json(db.profiles[req.userId]);
});

// WIPE PROFILE DATA
app.post('/api/profile/reset', (req, res) => {
  const db = readDB();
  
  // Filter out all assets associated with the user
  db.transactions = db.transactions.filter(t => t.userId !== req.userId);
  db.budgets = db.budgets.filter(b => b.userId !== req.userId);
  db.savings = db.savings.filter(s => s.userId !== req.userId);
  db.futurePlans = db.futurePlans.filter(p => p.userId !== req.userId);

  // Reset profile state
  db.profiles[req.userId] = {
    initialized: false,
    currentBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    targetSavings: 0
  };

  writeDB(db);
  res.json({ success: true, message: 'All personal data wiped and onboarding reset successfully.' });
});

// -------------------------------------------------------------
// TRANSACTIONS CRUD (AUTHENTICATED)
// -------------------------------------------------------------

app.get('/api/transactions', (req, res) => {
  const db = readDB();
  const userTxs = db.transactions.filter(t => t.userId === req.userId);
  const sorted = [...userTxs].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(sorted);
});

app.post('/api/transactions', (req, res) => {
  const { description, amount, category, type, date } = req.body;
  if (!description || amount === undefined || !category || !type || !date) {
    return res.status(400).json({ error: 'Missing required transaction fields' });
  }

  const db = readDB();
  const newTransaction = {
    id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId: req.userId,
    description,
    amount: parseFloat(amount),
    category,
    type,
    date
  };

  db.transactions.push(newTransaction);
  writeDB(db);
  res.status(201).json(newTransaction);
});

app.put('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const { description, amount, category, type, date } = req.body;

  const db = readDB();
  const index = db.transactions.findIndex(t => t.id === id && t.userId === req.userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found or unauthorized' });
  }

  const updatedTransaction = {
    ...db.transactions[index],
    description: description || db.transactions[index].description,
    amount: amount !== undefined ? parseFloat(amount) : db.transactions[index].amount,
    category: category || db.transactions[index].category,
    type: type || db.transactions[index].type,
    date: date || db.transactions[index].date
  };

  db.transactions[index] = updatedTransaction;
  writeDB(db);
  res.json(updatedTransaction);
});

app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.transactions.findIndex(t => t.id === id && t.userId === req.userId);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found or unauthorized' });
  }

  db.transactions.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Transaction deleted' });
});

// -------------------------------------------------------------
// BUDGETS CRUD (AUTHENTICATED)
// -------------------------------------------------------------

app.get('/api/budgets', (req, res) => {
  const db = readDB();
  const userBudgets = db.budgets.filter(b => b.userId === req.userId);
  res.json(userBudgets);
});

app.post('/api/budgets', (req, res) => {
  const { category, limit } = req.body;
  if (!category || limit === undefined) {
    return res.status(400).json({ error: 'Category and limit are required' });
  }

  const db = readDB();
  const index = db.budgets.findIndex(b => b.userId === req.userId && b.category.toLowerCase() === category.toLowerCase());
  
  if (index !== -1) {
    db.budgets[index].limit = parseFloat(limit);
  } else {
    db.budgets.push({ userId: req.userId, category, limit: parseFloat(limit) });
  }

  writeDB(db);
  const userBudgets = db.budgets.filter(b => b.userId === req.userId);
  res.json({ success: true, budgets: userBudgets });
});

// -------------------------------------------------------------
// SAVINGS CRUD (AUTHENTICATED)
// -------------------------------------------------------------

app.get('/api/savings', (req, res) => {
  const db = readDB();
  const userSavings = db.savings.filter(s => s.userId === req.userId);
  res.json(userSavings);
});

app.post('/api/savings', (req, res) => {
  const { name, target, current } = req.body;
  if (!name || target === undefined) {
    return res.status(400).json({ error: 'Name and target are required' });
  }

  const db = readDB();
  const newGoal = {
    id: `s_${Date.now()}`,
    userId: req.userId,
    name,
    target: parseFloat(target),
    current: current !== undefined ? parseFloat(current) : 0
  };

  db.savings.push(newGoal);
  writeDB(db);
  res.status(201).json(newGoal);
});

app.put('/api/savings/:id', (req, res) => {
  const { id } = req.params;
  const { name, target, current, depositAmount } = req.body;

  const db = readDB();
  const index = db.savings.findIndex(s => s.id === id && s.userId === req.userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Savings goal not found or unauthorized' });
  }

  const goal = db.savings[index];
  if (name) goal.name = name;
  if (target !== undefined) goal.target = parseFloat(target);
  if (current !== undefined) goal.current = parseFloat(current);
  if (depositAmount !== undefined) {
    goal.current = parseFloat(goal.current) + parseFloat(depositAmount);
  }

  writeDB(db);
  res.json(goal);
});

app.delete('/api/savings/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.savings.findIndex(s => s.id === id && s.userId === req.userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Savings goal not found or unauthorized' });
  }

  db.savings.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Savings goal deleted' });
});

// -------------------------------------------------------------
// FUTURE PLANS CRUD (AUTHENTICATED)
// -------------------------------------------------------------

app.get('/api/plans', (req, res) => {
  const db = readDB();
  const userPlans = db.futurePlans.filter(p => p.userId === req.userId);
  res.json(userPlans);
});

app.post('/api/plans', (req, res) => {
  const { title, targetAmount, timeframeMonths } = req.body;
  if (!title || targetAmount === undefined || !timeframeMonths) {
    return res.status(400).json({ error: 'Title, targetAmount, and timeframeMonths are required' });
  }

  const db = readDB();
  const newPlan = {
    id: `fp_${Date.now()}`,
    userId: req.userId,
    title,
    targetAmount: parseFloat(targetAmount),
    timeframeMonths: parseInt(timeframeMonths)
  };

  db.futurePlans.push(newPlan);
  writeDB(db);
  res.status(201).json(newPlan);
});

app.delete('/api/plans/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.futurePlans.findIndex(p => p.id === id && p.userId === req.userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Plan not found or unauthorized' });
  }

  db.futurePlans.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Future plan deleted' });
});

// -------------------------------------------------------------
// SUMMARY & STATISTICS (AUTHENTICATED)
// -------------------------------------------------------------

app.get('/api/summary', (req, res) => {
  const db = readDB();
  
  const userTxs = db.transactions.filter(t => t.userId === req.userId);
  const userSavings = db.savings.filter(s => s.userId === req.userId);
  
  const profile = db.profiles[req.userId] || {
    initialized: false,
    currentBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    targetSavings: 0
  };

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthTransactions = userTxs.filter(t => t.date.startsWith(currentMonthStr));

  // Overall totals
  let totalIncome = 0;
  let totalExpenses = 0;
  userTxs.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
    }
  });

  // Current month totals
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  currentMonthTransactions.forEach(t => {
    if (t.type === 'income') {
      monthlyIncome += t.amount;
    } else {
      monthlyExpenses += t.amount;
    }
  });

  // Category-wise expenses
  const monthlyCategoryExpenses = {};
  currentMonthTransactions.forEach(t => {
    if (t.type === 'expense') {
      monthlyCategoryExpenses[t.category] = (monthlyCategoryExpenses[t.category] || 0) + t.amount;
    }
  });

  // Trends (6 months)
  const trends = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    let inc = 0;
    let exp = 0;
    userTxs.forEach(t => {
      if (t.date.startsWith(prefix)) {
        if (t.type === 'income') {
          inc += t.amount;
        } else {
          exp += t.amount;
        }
      }
    });

    trends.push({
      month: monthLabel,
      income: inc,
      expense: exp
    });
  }

  // Savings progress summary
  let totalSavingsTarget = 0;
  let totalSavingsCurrent = 0;
  userSavings.forEach(s => {
    totalSavingsTarget += s.target;
    totalSavingsCurrent += s.current;
  });

  const baselineIncome = monthlyIncome > 0 ? monthlyIncome : (profile.monthlyIncome || 0);
  const activeSavingsRate = baselineIncome > 0 ? ((baselineIncome - monthlyExpenses) / baselineIncome) * 100 : 0;

  res.json({
    totals: {
      netBalance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      savingsRate: activeSavingsRate
    },
    monthly: {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      balance: monthlyIncome - monthlyExpenses,
      categories: monthlyCategoryExpenses
    },
    trends,
    savings: {
      target: totalSavingsTarget,
      current: totalSavingsCurrent,
      percentage: totalSavingsTarget > 0 ? (totalSavingsCurrent / totalSavingsTarget) * 100 : 0
    },
    profile
  });
});

// -------------------------------------------------------------
// DEVELOPER / ADMIN CONSOLE ENDPOINTS (AUTHENTICATED & ENFORCED)
// -------------------------------------------------------------

// Admin check middleware
const requireAdmin = (req, res, next) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.userId);
  if (!user || !user.admin) {
    return res.status(403).json({ error: 'Forbidden: Developer Admin access required' });
  }
  next();
};

// List all users
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const db = readDB();
  const list = db.users.map(u => {
    const profile = db.profiles[u.id] || { initialized: false };
    return {
      id: u.id,
      username: u.username,
      email: u.email || 'N/A',
      isVerified: u.isVerified || false,
      admin: !!u.admin,
      initialized: profile.initialized
    };
  });
  res.json(list);
});

// Toggle user verification status
app.post('/api/admin/users/:userId/toggle-verify', requireAuth, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.isVerified = !user.isVerified;
  writeDB(db);
  res.json({ success: true, isVerified: user.isVerified });
});

// Reset specific user's personal financial logs
app.post('/api/admin/users/:userId/reset', requireAuth, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const db = readDB();

  // Wipe specific records
  db.transactions = db.transactions.filter(t => t.userId !== userId);
  db.budgets = db.budgets.filter(b => b.userId !== userId);
  db.savings = db.savings.filter(s => s.userId !== userId);
  db.futurePlans = db.futurePlans.filter(p => p.userId !== userId);

  if (db.profiles[userId]) {
    db.profiles[userId] = {
      initialized: false,
      currentBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      targetSavings: 0
    };
  }

  writeDB(db);
  res.json({ success: true, message: 'User data has been completely wiped.' });
});

// Delete user account entirely
app.delete('/api/admin/users/:userId', requireAuth, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const db = readDB();

  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  if (userId === req.userId) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  db.users.splice(userIndex, 1);

  // Clean data associated
  db.transactions = db.transactions.filter(t => t.userId !== userId);
  db.budgets = db.budgets.filter(b => b.userId !== userId);
  db.savings = db.savings.filter(s => s.userId !== userId);
  db.futurePlans = db.futurePlans.filter(p => p.userId !== userId);
  delete db.profiles[userId];

  writeDB(db);
  res.json({ success: true, message: 'User account deleted completely.' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
