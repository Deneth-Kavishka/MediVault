# 🏥 MediVault API Testing - Complete Guide

## 🚀 Quick Start Guide

### Prerequisites Checklist

- [ ] MongoDB service running (check with: `Get-Service | Where-Object {$_.Name -like "*mongo*"}`)
- [ ] Node.js installed
- [ ] All npm dependencies installed (`npm install`)
- [ ] Environment variables configured in `.env` file

### Step 1: Start the Server

```powershell
# Open PowerShell and navigate to project directory
cd "c:\Users\Deneth\Desktop\Programmes\02.HD Finale Project\MediVault"

# Start the server (recommended: use server-fixed.js)
node server-fixed.js
```

**Expected Output:**

```
Starting MediVault server...
Middleware configured...
Basic routes configured...
Loading auth routes...
Auth routes loaded successfully
Loading users routes...
users routes loaded successfully
...
MediVault server running in development mode on port 5000
Server is ready to accept connections
MongoDB Connected: localhost
```

### Step 2: Choose Your Testing Method

## 📝 Method 1: VS Code REST Client (Recommended)

1. Install "REST Client" extension in VS Code
2. Open `api-tests.http` file
3. Click "Send Request" above each test
4. Copy tokens from responses to test protected routes

## 🖥️ Method 2: PowerShell Testing

### Basic Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
```

### User Registration

```powershell
$doctorData = @{
    firstName = "Dr. John"
    lastName = "Smith"
    email = "doctor@medivault.com"
    password = "Password123!"
    confirmPassword = "Password123!"
    nic = "198012345678"
    phone = "+94771234567"
    dateOfBirth = "1980-01-15"
    gender = "Male"
    address = @{
        street = "123 Medical Street"
        city = "Colombo"
        district = "Colombo"
        province = "Western"
        postalCode = "00300"
    }
    role = "Doctor"
    emergencyContact = @{
        name = "Jane Smith"
        relationship = "Spouse"
        phone = "+94771234568"
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $doctorData -ContentType "application/json"
```

## 🔧 Method 3: Automated Testing Script

```powershell
# Run comprehensive test suite
node api-test-comprehensive.js
```

## 📋 Complete Testing Checklist

### 🔐 Authentication Tests

- [ ] Health endpoint responds (GET /health)
- [ ] API info endpoint responds (GET /api)
- [ ] Doctor registration works with valid data
- [ ] Patient registration works with valid data
- [ ] Registration fails with invalid data (validation test)
- [ ] Login works with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Protected routes require authentication
- [ ] Invalid tokens are rejected

### 👥 User Management Tests

- [ ] Get current user info (GET /api/auth/me)
- [ ] Update user details (PUT /api/auth/updatedetails)
- [ ] Update password (PUT /api/auth/updatepassword)
- [ ] Role-based access control works

### 🏥 Patient Management Tests

- [ ] Create patient profiles (POST /api/patients)
- [ ] Get all patients (GET /api/patients)
- [ ] Get patient by ID (GET /api/patients/:id)
- [ ] Update patient info (PUT /api/patients/:id)
- [ ] Delete patient (DELETE /api/patients/:id)
- [ ] Add patient vitals (POST /api/patients/:id/vitals)

### 📅 Appointment System Tests

- [ ] Create appointments (POST /api/appointments)
- [ ] Get appointments (GET /api/appointments)
- [ ] Update appointment status (PUT /api/appointments/:id)
- [ ] Cancel appointments (DELETE /api/appointments/:id)
- [ ] Check appointment conflicts
- [ ] Filter appointments by date/doctor/patient

### 💊 Prescription Management Tests

- [ ] Create prescriptions (POST /api/prescriptions)
- [ ] Get prescriptions (GET /api/prescriptions)
- [ ] Generate QR codes
- [ ] Verify prescription QR codes (POST /api/prescriptions/verify)
- [ ] Dispense medications (PUT /api/prescriptions/:id/dispense)

### 📋 Medical Records Tests

- [ ] Create medical records (POST /api/medical-records)
- [ ] Get patient medical history (GET /api/medical-records)
- [ ] Update medical records (PUT /api/medical-records/:id)
- [ ] Add digital signatures
- [ ] Finalize records (PUT /api/medical-records/:id/finalize)

### 💉 Medicine & Inventory Tests

- [ ] Add medicines to database (POST /api/medicines)
- [ ] Get medicine catalog (GET /api/medicines)
- [ ] Manage inventory (POST /api/inventory)
- [ ] Check stock levels (GET /api/inventory)
- [ ] Update inventory (PUT /api/inventory/:id)

### 🧪 Lab Tests

- [ ] Create lab test orders (POST /api/lab-tests)
- [ ] Get lab tests (GET /api/lab-tests)
- [ ] Update test results (PUT /api/lab-tests/:id)
- [ ] Generate lab reports

## 🔍 Troubleshooting Guide

### Server Won't Start

```powershell
# Check if MongoDB is running
Get-Service | Where-Object {$_.Name -like "*mongo*"}

# Check if port 5000 is in use
netstat -an | findstr ":5000"

# Kill processes using port 5000
Stop-Process -Name "node" -Force
```

### Connection Refused Errors

1. Verify server is running in separate terminal
2. Check Windows Firewall settings
3. Ensure no antivirus blocking connections
4. Try different port in .env file

### Database Connection Issues

```powershell
# Restart MongoDB service
Restart-Service MongoDB

# Check MongoDB logs
# (Default location: C:\Program Files\MongoDB\Server\X.X\log\mongod.log)
```

### Authentication Errors

1. Verify user registration was successful
2. Check if email verification is required
3. Ensure password meets requirements (8+ chars, uppercase, lowercase, number, special char)
4. Verify JWT token is correctly formatted

### CORS Errors

- Server is configured to allow all origins in development
- Check browser console for specific CORS messages
- Verify server-fixed.js is being used

## 📊 Expected Response Formats

### Successful Registration

```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "Dr. John",
      "lastName": "Smith",
      "email": "doctor@medivault.com",
      "role": "Doctor",
      "status": "Pending"
    }
  }
}
```

### Successful Login

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "Dr. John",
      "lastName": "Smith",
      "email": "doctor@medivault.com",
      "role": "Doctor"
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## 🎯 Best Practices

### 1. Test in Order

1. Start with health checks
2. Test user registration and login
3. Test protected routes with valid tokens
4. Test CRUD operations for each entity
5. Test error scenarios

### 2. Use Proper Test Data

- Use realistic email addresses
- Use proper Sri Lankan NIC format
- Use valid phone number format (+94XXXXXXXXX)
- Use proper address structure with all required fields

### 3. Token Management

- Copy tokens from login responses
- Use different tokens for different user roles
- Test token expiration (default: 30 days)

### 4. Clean Up After Testing

```powershell
# Stop the server
# Ctrl+C in server terminal

# Optional: Clear test data from database
# (Only in development environment)
```

## 🔧 Advanced Testing

### Load Testing

```powershell
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 10 --num 2 http://localhost:5000/health
```

### API Documentation

- Use Postman to import the API collection
- Generate API documentation with Swagger (future enhancement)

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Verify all prerequisites are met
3. Check server logs for detailed error messages
4. Ensure all required npm packages are installed

## 🎉 Success Indicators

Your API is working correctly when:

- ✅ Server starts without errors
- ✅ Health endpoint returns 200 OK
- ✅ User registration and login work
- ✅ Protected routes require authentication
- ✅ CRUD operations work for all entities
- ✅ Error handling returns proper error messages
- ✅ Role-based access control functions properly

## 📈 Next Steps

After successful API testing:

1. Frontend development (React application)
2. Deploy to production environment
3. Set up monitoring and logging
4. Implement automated testing pipeline
5. Add API documentation with Swagger/OpenAPI
