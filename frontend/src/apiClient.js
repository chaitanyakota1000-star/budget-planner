// Pure JS SHA-256 implementation because crypto might be missing in some browser environments
function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  var maxWord = Math.pow(2, 32);
  var i, j;
  var result = '';
  var words = [];
  var asciiLength = ascii.length;
  
  var hash = [];
  var k = [];
  
  // Initialize constants
  var primeCounter = 0;
  var isPrime = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isPrime[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isPrime[i] = 1;
      }
      hash[primeCounter] = (Math.pow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  
  for (i = 0; i < ascii.length; i++) {
    var charCode = ascii.charCodeAt(i);
    if (charCode >> 8) return; // Only support ASCII
    words[i >> 2] |= charCode << (24 - 8 * (i % 4));
  }
  words[words.length] = ((asciiLength * 8) / maxWord) | 0;
  words[words.length] = (asciiLength * 8) | 0;
  
  for (j = 0; j < words.length; ) {
    var w = words.slice(j, j += 16);
    var oldHash = hash.slice(0);
    
    hash = hash.slice(0, 8);
    
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      var a = hash[0], e = hash[4], temp1, temp2;
      
      var w_i = w[i] = (i < 16) ? w[i] : (
        w[i - 16] +
        (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
        w[i - 7] +
        (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
      ) | 0;
      
      temp1 = (hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] + w_i) | 0;
        
      temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;
      
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    var byteString = '00000000' + (hash[i] >>> 0).toString(16);
    result += byteString.substr(byteString.length - 8);
  }
  return result;
}

const API_BASE = 'http://localhost:5000/api';

// Initialize offline DB seeds
const initialDb = {
  users: [
    {
      id: "u_chait",
      username: "chait",
      passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f", // password123
      email: "chait@example.com",
      isVerified: true,
      admin: false
    },
    {
      id: "u_admin",
      username: "admin",
      passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", // admin123
      email: "admin@finflow.com",
      isVerified: true,
      admin: true
    },
    {
      id: "u_chaitanya",
      username: "chaitanya",
      passwordHash: "5ee3099274db0ec97b49344793f5beb6823075e88d866372cdbb5ee7214bec69", // Chaitanya@1234
      email: "chaitanyakota1000@gmail.com",
      isVerified: true,
      admin: false
    }
  ],
  profiles: {
    "u_chait": {
      initialized: false,
      currentBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      targetSavings: 0
    },
    "u_admin": {
      initialized: true,
      currentBalance: 100000,
      monthlyIncome: 100000,
      monthlyExpenses: 0,
      targetSavings: 20000
    },
    "u_chaitanya": {
      initialized: false,
      currentBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      targetSavings: 0
    }
  },
  transactions: [],
  budgets: [],
  savings: [],
  futurePlans: [],
  mockEmails: []
};

// Check if database exists in localStorage, otherwise write seeds
const getLocalDB = () => {
  const db = localStorage.getItem('finflow_db');
  if (!db) {
    localStorage.setItem('finflow_db', JSON.stringify(initialDb));
    return initialDb;
  }
  
  let parsed;
  try {
    parsed = JSON.parse(db);
  } catch (e) {
    console.error('Failed to parse local database, resetting to seeds...', e);
    localStorage.setItem('finflow_db', JSON.stringify(initialDb));
    return initialDb;
  }

  // Ensure default structures are present and are of correct types
  if (!parsed || typeof parsed !== 'object') parsed = {};
  if (!parsed.users || !Array.isArray(parsed.users)) parsed.users = [];
  if (!parsed.profiles || typeof parsed.profiles !== 'object') parsed.profiles = {};
  if (!parsed.transactions || !Array.isArray(parsed.transactions)) parsed.transactions = [];
  if (!parsed.budgets || !Array.isArray(parsed.budgets)) parsed.budgets = [];
  if (!parsed.savings || !Array.isArray(parsed.savings)) parsed.savings = [];
  if (!parsed.futurePlans || !Array.isArray(parsed.futurePlans)) parsed.futurePlans = [];
  if (!parsed.mockEmails || !Array.isArray(parsed.mockEmails)) parsed.mockEmails = [];

  // Merge or update seeded users dynamically so local cached DBs get updated
  let modified = false;
  initialDb.users.forEach(seedUser => {
    const localUserIdx = parsed.users.findIndex(u => u && (u.username === seedUser.username || (u.email && u.email === seedUser.email)));
    if (localUserIdx === -1) {
      parsed.users.push(seedUser);
      if (initialDb.profiles[seedUser.id]) {
        parsed.profiles[seedUser.id] = initialDb.profiles[seedUser.id];
      }
      modified = true;
    } else {
      // If user exists but has outdated verification or password hash, update it
      const localUser = parsed.users[localUserIdx];
      if (localUser && (localUser.passwordHash !== seedUser.passwordHash || localUser.isVerified !== seedUser.isVerified)) {
        parsed.users[localUserIdx] = { ...localUser, passwordHash: seedUser.passwordHash, isVerified: seedUser.isVerified };
        modified = true;
      }
    }
  });

  if (modified) {
    localStorage.setItem('finflow_db', JSON.stringify(parsed));
  }

  return parsed;
};

const writeLocalDB = (db) => {
  localStorage.setItem('finflow_db', JSON.stringify(db));
};

const makeResponse = (data, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
};

class ApiClient {
  constructor() {
    // Mode status: 'backend' or 'offline'
    const storedMode = localStorage.getItem('finflow_api_mode');
    this.mode = storedMode || 'offline'; 
    this.initialized = false;
  }

  async checkBackendConnection() {
    if (window.location.hostname.endsWith('github.io')) {
      // Force offline mode on GitHub Pages
      this.mode = 'offline';
      localStorage.setItem('finflow_api_mode', 'offline');
      this.initialized = true;
      return false;
    }
    
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1200);
      
      const response = await fetch(`${API_BASE}/auth/mock-emails`, {
        signal: controller.signal
      });
      clearTimeout(id);
      
      if (response.ok) {
        // Only set default to backend if user hasn't explicitly set offline mode
        if (!localStorage.getItem('finflow_api_mode')) {
          this.mode = 'backend';
        }
      } else {
        this.mode = 'offline';
      }
    } catch (e) {
      this.mode = 'offline';
    }
    this.initialized = true;
    return this.mode === 'backend';
  }

  setMode(mode) {
    if (mode === 'backend' || mode === 'offline') {
      this.mode = mode;
      localStorage.setItem('finflow_api_mode', mode);
      return true;
    }
    return false;
  }

  getMode() {
    return this.mode;
  }

  // Intercept and route request
  async request(url, options = {}) {
    if (!this.initialized) {
      await this.checkBackendConnection();
    }

    if (this.mode === 'backend') {
      try {
        return await fetch(url, options);
      } catch (err) {
        console.warn('Backend fetch failed. Falling back to offline client mode.', err);
        this.mode = 'offline';
        // Fall through to offline mock server
      }
    }

    return this.mockRequest(url, options);
  }

  // Convenience HTTP aliases
  async get(url, headers = {}) {
    return this.request(url, { method: 'GET', headers });
  }

  async post(url, body, headers = {}) {
    return this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
  }

  async put(url, body, headers = {}) {
    return this.request(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
  }

  async delete(url, headers = {}) {
    return this.request(url, { method: 'DELETE', headers });
  }

  // Mock server routing
  mockRequest(url, options = {}) {
    const parsedUrl = new URL(url.startsWith('http') ? url : `http://localhost:5000${url}`);
    const pathname = parsedUrl.pathname;
    const method = (options.method || 'GET').toUpperCase();
    const headers = options.headers || {};
    const userId = headers['X-User-Id'] || localStorage.getItem('userId');
    const body = options.body ? JSON.parse(options.body) : null;

    const db = getLocalDB();

    // Helper: Find user from database
    const currentUser = db.users.find(u => u.id === userId);

    // 1. MOCK MAILBOX LOGS
    if (pathname === '/api/auth/mock-emails' && method === 'GET') {
      return makeResponse(db.mockEmails);
    }

    // 2. REGISTER ENDPOINT
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { username, password, email } = body;
      if (!username || !password || !email) {
        return makeResponse({ error: 'Username, password, and email are required' }, 400);
      }

      const normalizedUsername = username.trim().toLowerCase();
      const normalizedEmail = email.trim().toLowerCase();

      const userExists = db.users.some(u => u.username.toLowerCase() === normalizedUsername);
      if (userExists) {
        return makeResponse({ error: 'Username is already taken' }, 400);
      }

      const emailExists = db.users.some(u => u.email && u.email.toLowerCase() === normalizedEmail);
      if (emailExists) {
        return makeResponse({ error: 'Email address is already registered' }, 400);
      }

      const newUserId = `u_${Date.now()}`;
      const verificationOtp = String(Math.floor(100000 + Math.random() * 900000));
      const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

      const newUser = {
        id: newUserId,
        username: username.trim(),
        email: normalizedEmail,
        passwordHash: sha256(password),
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

      // Add to local mockEmails queue
      db.mockEmails.unshift({
        id: `mail_${Date.now()}`,
        to: newUser.email,
        subject: 'Verify your FinFlow Account - OTP Code (Simulated)',
        body: `Hi ${newUser.username},\n\nHere is your 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code will expire in 5 minutes.\n\nThis is a simulated verification email for local development.`,
        date: new Date().toISOString()
      });

      writeLocalDB(db);
      return makeResponse({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        needsVerification: true,
        admin: false
      }, 201);
    }

    // 3. VERIFY ENDPOINT
    if (pathname === '/api/auth/verify' && method === 'POST') {
      const { userId: regUserId, code } = body;
      const userIndex = db.users.findIndex(u => u.id === regUserId);
      if (userIndex === -1) {
        return makeResponse({ error: 'User not found' }, 404);
      }

      const user = db.users[userIndex];

      // Expiry validation
      if (user.otpExpiry && Date.now() > user.otpExpiry) {
        return makeResponse({ error: 'Verification OTP code has expired. Please request a new one.' }, 400);
      }

      if (user.verificationCode === code) {
        db.users[userIndex].isVerified = true;
        db.users[userIndex].verificationCode = null;
        db.users[userIndex].otpExpiry = null;
        writeLocalDB(db);
        return makeResponse({
          id: db.users[userIndex].id,
          username: db.users[userIndex].username,
          email: db.users[userIndex].email,
          admin: !!db.users[userIndex].admin
        });
      } else {
        return makeResponse({ error: 'Invalid verification OTP code. Please try again.' }, 400);
      }
    }

    // 3.5. RESEND OTP ENDPOINT MOCK
    if (pathname === '/api/auth/resend' && method === 'POST') {
      const { userId: regUserId } = body;
      const userIndex = db.users.findIndex(u => u.id === regUserId);
      if (userIndex === -1) {
        return makeResponse({ error: 'User not found' }, 404);
      }

      if (db.users[userIndex].isVerified) {
        return makeResponse({ error: 'Account is already verified' }, 400);
      }

      const verificationOtp = String(Math.floor(100000 + Math.random() * 900000));
      const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
      db.users[userIndex].verificationCode = verificationOtp;
      db.users[userIndex].otpExpiry = otpExpiry;

      db.mockEmails.unshift({
        id: `mail_${Date.now()}`,
        to: db.users[userIndex].email,
        subject: 'Verify your FinFlow Account - OTP Code (Simulated Resend)',
        body: `Hi ${db.users[userIndex].username},\n\nHere is your new 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code will expire in 5 minutes.\n\nThis is a simulated verification email for local development.`,
        date: new Date().toISOString()
      });

      writeLocalDB(db);
      return makeResponse({ success: true, message: 'Verification OTP has been resent.' });
    }

    // 4. LOGIN ENDPOINT
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = body;
      if (!username || !password) {
        return makeResponse({ error: 'Username and password are required' }, 400);
      }

      const identifier = username.trim().toLowerCase();
      const user = db.users.find(u => 
        u.username.toLowerCase() === identifier || 
        (u.email && u.email.toLowerCase() === identifier)
      );

      if (!user) {
        return makeResponse({ error: 'Invalid username or password' }, 401);
      }

      if (user.passwordHash !== sha256(password)) {
        return makeResponse({ error: 'Invalid username or password' }, 401);
      }

      if (user.isVerified === false) {
        const verificationOtp = String(Math.floor(100000 + Math.random() * 900000));
        const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        user.verificationCode = verificationOtp;
        user.otpExpiry = otpExpiry;

        db.mockEmails.unshift({
          id: `mail_${Date.now()}`,
          to: user.email,
          subject: 'Verify your FinFlow Account - OTP Code (Re-sent)',
          body: `Hi ${user.username},\n\nHere is your new 6-digit OTP verification code:\n\n👉 OTP Code: ${verificationOtp}\n\nThis code will expire in 5 minutes.\n\nThis is a simulated verification email for local development.`,
          date: new Date().toISOString()
        });

        const userIdx = db.users.findIndex(u => u.id === user.id);
        db.users[userIdx] = user;
        writeLocalDB(db);

        return makeResponse({
          error: 'Account email is not verified.',
          needsVerification: true,
          userId: user.id
        }, 403);
      }

      return makeResponse({
        id: user.id,
        username: user.username,
        email: user.email,
        admin: !!user.admin
      });
    }

    // 5. CHANGE PASSWORD
    if (pathname === '/api/auth/change-password' && method === 'POST') {
      const { oldPassword, newPassword } = body;
      if (!currentUser) return makeResponse({ error: 'Unauthorized' }, 401);

      if (currentUser.passwordHash !== sha256(oldPassword)) {
        return makeResponse({ error: 'Current password is incorrect' }, 400);
      }

      currentUser.passwordHash = sha256(newPassword);
      // Find and update in the array
      const userIdx = db.users.findIndex(u => u.id === currentUser.id);
      db.users[userIdx] = currentUser;

      writeLocalDB(db);
      return makeResponse({ message: 'Password changed successfully' });
    }

    // AUTH REQUIRED GATE
    if (!currentUser) {
      return makeResponse({ error: 'Unauthorized user credentials' }, 401);
    }

    // 6. PROFILE RESET DATA
    if (pathname === '/api/profile/reset' && method === 'POST') {
      db.transactions = db.transactions.filter(t => t.userId !== userId);
      db.budgets = db.budgets.filter(b => b.userId !== userId);
      db.savings = db.savings.filter(s => s.userId !== userId);
      db.futurePlans = db.futurePlans.filter(p => p.userId !== userId);

      db.profiles[userId] = {
        initialized: false,
        currentBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        targetSavings: 0
      };

      writeLocalDB(db);
      return makeResponse({ message: 'User ledger and parameters wiped successfully' });
    }

    // 7. GET PROFILE
    if (pathname === '/api/profile' && method === 'GET') {
      const p = db.profiles[userId] || { initialized: false, currentBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, targetSavings: 0 };
      return makeResponse(p);
    }

    // 8. SAVE PROFILE (Onboarding or update)
    if (pathname === '/api/profile' && method === 'POST') {
      const { currentBalance, monthlyIncome, targetSavings, budgets: listBudgets } = body;
      const isFirstTime = !db.profiles[userId]?.initialized;

      db.profiles[userId] = {
        initialized: true,
        currentBalance: parseFloat(currentBalance),
        monthlyIncome: parseFloat(monthlyIncome),
        monthlyExpenses: 0, // calculated dynamically later
        targetSavings: parseFloat(targetSavings)
      };

      // Wipe old budgets and write new ones
      db.budgets = db.budgets.filter(b => b.userId !== userId);
      
      let seededSpendsTotal = 0;
      const initialTransactions = [];

      listBudgets.forEach(b => {
        db.budgets.push({
          userId,
          category: b.category,
          limit: parseFloat(b.limit)
        });

        // Seed spent transaction
        if (isFirstTime && b.spent && parseFloat(b.spent) > 0) {
          const spentVal = parseFloat(b.spent);
          seededSpendsTotal += spentVal;
          initialTransactions.push({
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            userId,
            type: 'expense',
            category: b.category,
            amount: spentVal,
            date: new Date().toISOString().split('T')[0],
            description: `Seeded spending during setup`
          });
        }
      });

      // Write starting transactions
      if (isFirstTime) {
        // Create initial balance transaction plus sum of expenses so Net balance matches entered value
        const initialIncomeAmount = parseFloat(currentBalance) + seededSpendsTotal;
        db.transactions.push({
          id: `tx_${Date.now()}_bal`,
          userId,
          type: 'income',
          category: 'Initial Balance',
          amount: initialIncomeAmount,
          date: new Date().toISOString().split('T')[0],
          description: 'Starting ledger balance'
        });

        // Push seeded expenses
        db.transactions.push(...initialTransactions);
      }

      writeLocalDB(db);
      return makeResponse(db.profiles[userId]);
    }

    // 9. TRANSACTIONS CRUD
    if (pathname === '/api/transactions' && method === 'GET') {
      const list = db.transactions.filter(t => t.userId === userId);
      // Sort: date desc, id desc
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      return makeResponse(list);
    }

    if (pathname === '/api/transactions' && method === 'POST') {
      const { type, category, amount, date, description } = body;
      const newTx = {
        id: `tx_${Date.now()}`,
        userId,
        type,
        category,
        amount: parseFloat(amount),
        date: date || new Date().toISOString().split('T')[0],
        description: (description || '').trim()
      };
      db.transactions.push(newTx);
      writeLocalDB(db);
      return makeResponse(newTx, 201);
    }

    // Matches /api/transactions/:id
    const txIdMatch = pathname.match(/^\/api\/transactions\/([^\/]+)$/);
    if (txIdMatch && method === 'PUT') {
      const id = txIdMatch[1];
      const idx = db.transactions.findIndex(t => t.id === id && t.userId === userId);
      if (idx !== -1) {
        db.transactions[idx] = {
          ...db.transactions[idx],
          type: body.type,
          category: body.category,
          amount: parseFloat(body.amount),
          date: body.date,
          description: body.description
        };
        writeLocalDB(db);
        return makeResponse(db.transactions[idx]);
      }
      return makeResponse({ error: 'Transaction not found' }, 404);
    }

    if (txIdMatch && method === 'DELETE') {
      const id = txIdMatch[1];
      const initialLen = db.transactions.length;
      db.transactions = db.transactions.filter(t => !(t.id === id && t.userId === userId));
      if (db.transactions.length < initialLen) {
        writeLocalDB(db);
        return makeResponse({ message: 'Transaction deleted' });
      }
      return makeResponse({ error: 'Transaction not found' }, 404);
    }

    // 10. BUDGETS CRUD
    if (pathname === '/api/budgets' && method === 'GET') {
      const list = db.budgets.filter(b => b.userId === userId);
      return makeResponse(list);
    }

    if (pathname === '/api/budgets' && method === 'POST') {
      const { category, limit } = body;
      const existingIdx = db.budgets.findIndex(b => b.userId === userId && b.category === category);
      if (existingIdx !== -1) {
        db.budgets[existingIdx].limit = parseFloat(limit);
      } else {
        db.budgets.push({
          userId,
          category,
          limit: parseFloat(limit)
        });
      }
      writeLocalDB(db);
      return makeResponse({ message: 'Budget saved' });
    }

    // 11. SAVINGS GOALS CRUD
    if (pathname === '/api/savings' && method === 'GET') {
      const list = db.savings.filter(s => s.userId === userId);
      return makeResponse(list);
    }

    if (pathname === '/api/savings' && method === 'POST') {
      const { title, targetAmount, currentSavings, timeframeMonths } = body;
      const newSavings = {
        id: `save_${Date.now()}`,
        userId,
        title,
        targetAmount: parseFloat(targetAmount),
        currentSavings: parseFloat(currentSavings || 0),
        timeframeMonths: parseInt(timeframeMonths)
      };
      db.savings.push(newSavings);
      writeLocalDB(db);
      return makeResponse(newSavings, 201);
    }

    const savingsIdMatch = pathname.match(/^\/api\/savings\/([^\/]+)$/);
    if (savingsIdMatch && method === 'PUT') {
      const id = savingsIdMatch[1];
      const idx = db.savings.findIndex(s => s.id === id && s.userId === userId);
      if (idx !== -1) {
        if (body.depositAmount !== undefined) {
          db.savings[idx].currentSavings += parseFloat(body.depositAmount);
        } else {
          db.savings[idx].title = body.title;
          db.savings[idx].targetAmount = parseFloat(body.targetAmount);
          db.savings[idx].currentSavings = parseFloat(body.currentSavings);
          db.savings[idx].timeframeMonths = parseInt(body.timeframeMonths);
        }
        writeLocalDB(db);
        return makeResponse(db.savings[idx]);
      }
      return makeResponse({ error: 'Savings goal not found' }, 404);
    }

    if (savingsIdMatch && method === 'DELETE') {
      const id = savingsIdMatch[1];
      const initialLen = db.savings.length;
      db.savings = db.savings.filter(s => !(s.id === id && s.userId === userId));
      if (db.savings.length < initialLen) {
        writeLocalDB(db);
        return makeResponse({ message: 'Savings goal deleted' });
      }
      return makeResponse({ error: 'Savings goal not found' }, 404);
    }

    // 12. PLANS CRUD
    if (pathname === '/api/plans' && method === 'GET') {
      const list = db.futurePlans.filter(p => p.userId === userId);
      return makeResponse(list);
    }

    if (pathname === '/api/plans' && method === 'POST') {
      const { title, cost, timeframeMonths, simulated } = body;
      const newPlan = {
        id: `plan_${Date.now()}`,
        userId,
        title,
        cost: parseFloat(cost),
        timeframeMonths: parseInt(timeframeMonths),
        simulated: !!simulated
      };
      db.futurePlans.push(newPlan);
      writeLocalDB(db);
      return makeResponse(newPlan, 201);
    }

    const planIdMatch = pathname.match(/^\/api\/plans\/([^\/]+)$/);
    if (planIdMatch && method === 'DELETE') {
      const id = planIdMatch[1];
      const initialLen = db.futurePlans.length;
      db.futurePlans = db.futurePlans.filter(p => !(p.id === id && p.userId === userId));
      if (db.futurePlans.length < initialLen) {
        writeLocalDB(db);
        return makeResponse({ message: 'Plan deleted' });
      }
      return makeResponse({ error: 'Plan not found' }, 404);
    }

    // 13. ADMIN CONSOLE ENDPOINTS
    if (pathname === '/api/admin/users' && method === 'GET') {
      if (!currentUser.admin) return makeResponse({ error: 'Forbidden' }, 403);
      
      const adminUsersList = db.users.map(u => {
        const hasProfile = !!db.profiles[u.id];
        const isInit = hasProfile ? db.profiles[u.id].initialized : false;
        return {
          id: u.id,
          username: u.username,
          email: u.email,
          isVerified: u.isVerified,
          admin: !!u.admin,
          initialized: isInit
        };
      });
      return makeResponse(adminUsersList);
    }

    const adminUserResetMatch = pathname.match(/^\/api\/admin\/users\/([^\/]+)\/reset$/);
    if (adminUserResetMatch && method === 'POST') {
      if (!currentUser.admin) return makeResponse({ error: 'Forbidden' }, 403);
      const targetUserId = adminUserResetMatch[1];

      db.transactions = db.transactions.filter(t => t.userId !== targetUserId);
      db.budgets = db.budgets.filter(b => b.userId !== targetUserId);
      db.savings = db.savings.filter(s => s.userId !== targetUserId);
      db.futurePlans = db.futurePlans.filter(p => p.userId !== targetUserId);

      db.profiles[targetUserId] = {
        initialized: false,
        currentBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        targetSavings: 0
      };

      writeLocalDB(db);
      return makeResponse({ message: `Wiped user data for ${targetUserId}` });
    }

    const adminUserToggleMatch = pathname.match(/^\/api\/admin\/users\/([^\/]+)\/toggle-verify$/);
    if (adminUserToggleMatch && method === 'POST') {
      if (!currentUser.admin) return makeResponse({ error: 'Forbidden' }, 403);
      const targetUserId = adminUserToggleMatch[1];
      const targetIdx = db.users.findIndex(u => u.id === targetUserId);
      
      if (targetIdx !== -1) {
        db.users[targetIdx].isVerified = !db.users[targetIdx].isVerified;
        writeLocalDB(db);
        return makeResponse({ message: 'Verified status toggled' });
      }
      return makeResponse({ error: 'User not found' }, 404);
    }

    const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([^\/]+)$/);
    if (adminUserMatch && method === 'DELETE') {
      if (!currentUser.admin) return makeResponse({ error: 'Forbidden' }, 403);
      const targetUserId = adminUserMatch[1];

      db.users = db.users.filter(u => u.id !== targetUserId);
      delete db.profiles[targetUserId];
      db.transactions = db.transactions.filter(t => t.userId !== targetUserId);
      db.budgets = db.budgets.filter(b => b.userId !== targetUserId);
      db.savings = db.savings.filter(s => s.userId !== targetUserId);
      db.futurePlans = db.futurePlans.filter(p => p.userId !== targetUserId);

      writeLocalDB(db);
      return makeResponse({ message: 'User deleted completely' });
    }

    // 14. SUMMARY ENDPOINT (Complex math replication matching backend schema)
    if (pathname === '/api/summary' && method === 'GET') {
      const userProfile = db.profiles[userId] || { initialized: false, currentBalance: 0, monthlyIncome: 0, monthlyExpenses: 0, targetSavings: 0 };
      const userTxs = db.transactions.filter(t => t.userId === userId);
      const userSavings = (db.savings || []).filter(s => s.userId === userId);

      // Compute total income & expenses in active ledger
      let totalIncome = 0;
      let totalExpenses = 0;
      userTxs.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpenses += t.amount;
      });

      const netBalance = totalIncome - totalExpenses;

      // Group active month spending by category
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentMonthTransactions = userTxs.filter(t => t.date && t.date.startsWith(currentMonthStr));

      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      currentMonthTransactions.forEach(t => {
        if (t.type === 'income') {
          monthlyIncome += t.amount;
        } else {
          monthlyExpenses += t.amount;
        }
      });

      const categorySpent = {};
      currentMonthTransactions.forEach(t => {
        if (t.type === 'expense') {
          categorySpent[t.category] = (categorySpent[t.category] || 0) + t.amount;
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
          if (t.date && t.date.startsWith(prefix)) {
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
        totalSavingsTarget += (s.targetAmount || s.target || 0);
        totalSavingsCurrent += (s.currentSavings || s.current || 0);
      });

      const baselineIncome = monthlyIncome > 0 ? monthlyIncome : (userProfile.monthlyIncome || 0);
      const activeSavingsRate = baselineIncome > 0 ? Math.round(((baselineIncome - monthlyExpenses) / baselineIncome) * 100) : 0;

      // Update in-memory profile monthly expenses
      userProfile.monthlyExpenses = monthlyExpenses;
      db.profiles[userId] = userProfile;
      writeLocalDB(db);

      const summaryResponse = {
        profile: userProfile,
        totals: {
          totalIncome,
          totalExpenses,
          netBalance,
          savingsRate: activeSavingsRate
        },
        monthly: {
          income: monthlyIncome,
          expenses: monthlyExpenses,
          balance: monthlyIncome - monthlyExpenses,
          categories: categorySpent
        },
        trends,
        savings: {
          target: totalSavingsTarget,
          current: totalSavingsCurrent,
          percentage: totalSavingsTarget > 0 ? (totalSavingsCurrent / totalSavingsTarget) * 100 : 0
        }
      };

      return makeResponse(summaryResponse);
    }

    return makeResponse({ error: 'Endpoint Mock Not Found' }, 404);
  }
}

export const apiClient = new ApiClient();
