# MediVault API Testing Guide

## Overview

This guide provides comprehensive instructions for testing the MediVault healthcare management API endpoints.

## Prerequisites

1. MongoDB service running on localhost:27017
2. Node.js environment set up
3. Environment variables configured in `.env` file

## Server Setup

### Method 1: Using Separate PowerShell Window (Recommended)

```powershell
# Open a new PowerShell window and navigate to project directory
cd "c:\Users\Deneth\Desktop\Programmes\02.HD Finale Project\MediVault"

# Start the server (keep this window open)
node server-fixed.js
```

### Method 2: Using PM2 Process Manager

```powershell
# Install PM2 globally
npm install -g pm2

# Start server with PM2
pm2 start server-fixed.js --name "medivault-api"

# View logs
pm2 logs medivault-api

# Stop server
pm2 stop medivault-api
```

## API Testing Methods

### 1. PowerShell Testing (Windows)

#### Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
```

#### API Information

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api" -Method GET
```

#### User Registration

```powershell
$registrationData = @{
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

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registrationData -ContentType "application/json"
```

#### User Login

```powershell
$loginData = @{
    email = "doctor@medivault.com"
    password = "Password123!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$token = $loginResponse.token
```

#### Get Current User (Protected Route)

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers $headers
```

### 2. cURL Testing (Cross-platform)

#### Health Check

```bash
curl -X GET http://localhost:5000/health
```

#### User Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Dr. John",
    "lastName": "Smith",
    "email": "doctor@medivault.com",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "nic": "198012345678",
    "phone": "+94771234567",
    "dateOfBirth": "1980-01-15",
    "gender": "Male",
    "address": {
      "street": "123 Medical Street",
      "city": "Colombo",
      "district": "Colombo",
      "province": "Western",
      "postalCode": "00300"
    },
    "role": "Doctor",
    "emergencyContact": {
      "name": "Jane Smith",
      "relationship": "Spouse",
      "phone": "+94771234568"
    }
  }'
```

### 3. VS Code REST Client Extension

Create a file named `api-tests.http` in your project root:

```http
### Health Check
GET http://localhost:5000/health

### API Information
GET http://localhost:5000/api

### User Registration - Doctor
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "firstName": "Dr. John",
  "lastName": "Smith",
  "email": "doctor@medivault.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "nic": "198012345678",
  "phone": "+94771234567",
  "dateOfBirth": "1980-01-15",
  "gender": "Male",
  "address": {
    "street": "123 Medical Street",
    "city": "Colombo",
    "district": "Colombo",
    "province": "Western",
    "postalCode": "00300"
  },
  "role": "Doctor",
  "emergencyContact": {
    "name": "Jane Smith",
    "relationship": "Spouse",
    "phone": "+94771234568"
  }
}

### User Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "doctor@medivault.com",
  "password": "Password123!"
}

### Get Current User (Use token from login response)
GET http://localhost:5000/api/auth/me
Authorization: Bearer YOUR_TOKEN_HERE
```

## Complete Testing Workflow

### 1. Authentication Testing

1. Register a doctor user
2. Register a patient user
3. Login with both users
4. Test protected routes with valid tokens
5. Test unauthorized access without tokens

### 2. Patient Management Testing

1. Create patient profiles
2. Update patient information
3. Retrieve patient data
4. Test role-based access (doctor vs patient)

### 3. Appointment System Testing

1. Create appointments
2. Update appointment status
3. Test appointment conflicts
4. Retrieve appointments by date/doctor/patient

### 4. Prescription Management Testing

1. Create prescriptions
2. Generate QR codes
3. Verify prescriptions
4. Test drug interaction checks

### 5. Medical Records Testing

1. Create medical records
2. Add digital signatures
3. Test finalization process
4. Retrieve patient medical history

## Expected Responses

### Successful Registration Response

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

### Successful Login Response

```json
{
  "success": true,
  "token": "jwt_token_here",
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

## Troubleshooting

### Common Issues

1. **Server not responding**: Ensure server is running in separate terminal
2. **CORS errors**: Check if server is properly configured for development
3. **Validation errors**: Verify all required fields are provided
4. **MongoDB connection**: Ensure MongoDB service is running

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (development only)"
}
```

## Testing Checklist

- [ ] Health endpoint responds
- [ ] API info endpoint responds
- [ ] User registration works with valid data
- [ ] User registration fails with invalid data
- [ ] User login works with correct credentials
- [ ] User login fails with incorrect credentials
- [ ] Protected routes require authentication
- [ ] Role-based access control works
- [ ] CRUD operations for all entities work
- [ ] Error handling works correctly
- [ ] Validation works for all endpoints

## Performance Testing

### Load Testing with Artillery

```bash
npm install -g artillery

# Create artillery config
# artillery quick --count 10 --num 10 http://localhost:5000/health
```

## Security Testing

1. Test SQL injection attempts
2. Test XSS attempts
3. Test rate limiting
4. Test authentication bypass attempts
5. Test unauthorized data access

## Next Steps

1. Set up automated testing with Jest/Mocha
2. Implement continuous integration
3. Add API documentation with Swagger
4. Set up monitoring and logging
5. Configure production environment
