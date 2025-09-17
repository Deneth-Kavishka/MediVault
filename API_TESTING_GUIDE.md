# MediVault API Testing Guide

## Server Information

- **Base URL**: `http://localhost:5000`
- **API Base**: `http://localhost:5000/api`
- **Health Check**: `http://localhost:5000/health`

## Testing Tools

You can use any of these tools for API testing:

- **Postman** (Recommended)
- **Insomnia**
- **VS Code REST Client**
- **curl** (Command line)
- **Thunder Client** (VS Code Extension)

## Test Data Setup

### Test Users for Different Roles

```json
// Doctor
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
  "address": "123 Medical Street, Colombo 03",
  "role": "Doctor",
  "emergencyContact": {
    "name": "Jane Smith",
    "relationship": "Spouse",
    "phone": "+94771234568"
  }
}

// Patient
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "patient@medivault.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "nic": "199512345679",
  "phone": "+94777654321",
  "dateOfBirth": "1995-05-20",
  "gender": "Female",
  "address": "456 Patient Avenue, Kandy",
  "role": "Patient",
  "emergencyContact": {
    "name": "Mike Johnson",
    "relationship": "Father",
    "phone": "+94777654322"
  },
  "bloodType": "A+",
  "height": 165,
  "weight": 58
}

// Pharmacist
{
  "firstName": "David",
  "lastName": "Pharmacy",
  "email": "pharmacist@medivault.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "nic": "198712345680",
  "phone": "+94771112233",
  "dateOfBirth": "1987-03-10",
  "gender": "Male",
  "address": "789 Pharmacy Road, Galle",
  "role": "Pharmacist",
  "emergencyContact": {
    "name": "Lisa Pharmacy",
    "relationship": "Spouse",
    "phone": "+94771112234"
  }
}

// Admin
{
  "firstName": "Admin",
  "lastName": "User",
  "email": "admin@medivault.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "nic": "197512345681",
  "phone": "+94705556677",
  "dateOfBirth": "1975-12-01",
  "gender": "Male",
  "address": "101 Admin Plaza, Colombo 01",
  "role": "Admin",
  "emergencyContact": {
    "name": "System Admin",
    "relationship": "Colleague",
    "phone": "+94705556678"
  }
}
```

## API Test Scenarios

### 1. Health Check & Server Status

```http
GET http://localhost:5000/health
Content-Type: application/json
```

Expected Response:

```json
{
  "success": true,
  "message": "MediVault API is running",
  "timestamp": "2025-09-17T...",
  "version": "1.0.0"
}
```

### 2. API Information

```http
GET http://localhost:5000/api
Content-Type: application/json
```

## Authentication API Tests

### 2.1 User Registration (Doctor)

```http
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
  "address": "123 Medical Street, Colombo 03",
  "role": "Doctor",
  "emergencyContact": {
    "name": "Jane Smith",
    "relationship": "Spouse",
    "phone": "+94771234568"
  }
}
```

### 2.2 User Login

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "doctor@medivault.com",
  "password": "Password123!"
}
```

**Save the JWT token from login response for subsequent requests!**

### 2.3 Get Current User

```http
GET http://localhost:5000/api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

### 2.4 Update Password

```http
PUT http://localhost:5000/api/auth/updatepassword
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

## Patient Management API Tests

### 3.1 Create Patient (Admin/Doctor)

```http
POST http://localhost:5000/api/patients
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "patient@medivault.com",
  "nic": "199512345679",
  "phone": "+94777654321",
  "dateOfBirth": "1995-05-20",
  "gender": "Female",
  "address": "456 Patient Avenue, Kandy",
  "emergencyContact": {
    "name": "Mike Johnson",
    "relationship": "Father",
    "phone": "+94777654322"
  },
  "bloodType": "A+",
  "height": 165,
  "weight": 58,
  "allergies": [
    {
      "allergen": "Penicillin",
      "severity": "Severe",
      "reaction": "Anaphylaxis"
    }
  ]
}
```

### 3.2 Get All Patients

```http
GET http://localhost:5000/api/patients
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

### 3.3 Get Patient by ID

```http
GET http://localhost:5000/api/patients/PATIENT_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

### 3.4 Update Patient Vitals

```http
PUT http://localhost:5000/api/patients/PATIENT_ID_HERE/vitals
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
  "bloodPressure": "120/80",
  "heartRate": 72,
  "temperature": 36.5,
  "respiratoryRate": 16,
  "oxygenSaturation": 98,
  "height": 165,
  "weight": 58
}
```

## Appointment Management API Tests

### 4.1 Create Appointment

```http
POST http://localhost:5000/api/appointments
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
  "patient": "PATIENT_ID_HERE",
  "doctor": "DOCTOR_ID_HERE",
  "appointmentDate": "2025-09-20",
  "appointmentTime": "10:00",
  "appointmentType": "Consultation",
  "reason": "Regular checkup",
  "notes": "Patient reports feeling well",
  "priority": "Medium"
}
```

### 4.2 Get All Appointments

```http
GET http://localhost:5000/api/appointments
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

### 4.3 Update Appointment Status

```http
PUT http://localhost:5000/api/appointments/APPOINTMENT_ID_HERE
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
  "status": "In Progress",
  "notes": "Patient arrived on time"
}
```

### 4.4 Complete Appointment

```http
PUT http://localhost:5000/api/appointments/APPOINTMENT_ID_HERE/complete
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
  "clinicalNotes": "Patient shows good progress",
  "diagnosis": "Healthy",
  "treatment": "Continue current lifestyle",
  "followUpInstructions": "Return in 6 months for routine checkup"
}
```

## Prescription Management API Tests

### 5.1 Create Prescription

```http
POST http://localhost:5000/api/prescriptions
Authorization: Bearer YOUR_JWT_TOKEN_HERE (Doctor token)
Content-Type: application/json

{
  "patient": "PATIENT_ID_HERE",
  "medicines": [
    {
      "medicine": "MEDICINE_ID_HERE",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "7 days",
      "quantity": 14,
      "instructions": "Take with food"
    }
  ],
  "instructions": "Complete the full course",
  "diagnosis": "Bacterial infection",
  "notes": "Monitor for allergic reactions",
  "refillsAllowed": 0,
  "validUntil": "2025-10-17"
}
```

### 5.2 Get All Prescriptions

```http
GET http://localhost:5000/api/prescriptions
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

### 5.3 Verify Prescription (QR Code)

```http
POST http://localhost:5000/api/prescriptions/verify
Authorization: Bearer YOUR_JWT_TOKEN_HERE (Pharmacist token)
Content-Type: application/json

{
  "qrData": "QR_CODE_DATA_FROM_PRESCRIPTION"
}
```

### 5.4 Dispense Prescription

```http
PUT http://localhost:5000/api/prescriptions/PRESCRIPTION_ID_HERE/dispense
Authorization: Bearer YOUR_JWT_TOKEN_HERE (Pharmacist token)
Content-Type: application/json

{
  "notes": "All medications dispensed successfully"
}
```

## Medical Records API Tests

### 6.1 Create Medical Record

```http
POST http://localhost:5000/api/medical-records
Authorization: Bearer YOUR_JWT_TOKEN_HERE (Doctor token)
Content-Type: application/json

{
  "patient": "PATIENT_ID_HERE",
  "recordType": "Consultation",
  "visitDate": "2025-09-17",
  "chiefComplaint": "Chest pain",
  "historyOfPresentIllness": "Patient reports chest pain for 2 days",
  "physicalExamination": {
    "general": "Alert and oriented",
    "vitals": {
      "bloodPressure": "120/80",
      "heartRate": 72,
      "temperature": 36.5
    },
    "cardiovascular": "Normal heart sounds",
    "respiratory": "Clear lung fields"
  },
  "diagnoses": {
    "primaryDiagnosis": "Chest wall pain",
    "secondaryDiagnoses": []
  },
  "treatment": {
    "medications": ["Ibuprofen 400mg"],
    "procedures": [],
    "recommendations": "Rest and avoid strenuous activity"
  },
  "followUpPlan": "Return if symptoms worsen",
  "notes": "Patient educated about condition"
}
```

### 6.2 Get Medical Records

```http
GET http://localhost:5000/api/medical-records
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

### 6.3 Finalize Medical Record

```http
PUT http://localhost:5000/api/medical-records/RECORD_ID_HERE/finalize
Authorization: Bearer YOUR_JWT_TOKEN_HERE (Doctor token)
Content-Type: application/json
```

## Statistics API Tests

### 7.1 Patient Statistics

```http
GET http://localhost:5000/api/patients/stats
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

### 7.2 Appointment Statistics

```http
GET http://localhost:5000/api/appointments/stats
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

### 7.3 Prescription Statistics

```http
GET http://localhost:5000/api/prescriptions/stats
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

## Error Testing Scenarios

### 8.1 Invalid Authentication

```http
GET http://localhost:5000/api/patients
Authorization: Bearer invalid_token
Content-Type: application/json
```

### 8.2 Missing Required Fields

```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "firstName": "Test",
  "email": "incomplete@test.com"
}
```

### 8.3 Unauthorized Access

```http
GET http://localhost:5000/api/patients
Content-Type: application/json
```

## Expected HTTP Status Codes

- **200**: Successful GET, PUT requests
- **201**: Successful POST (creation)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate data)
- **422**: Unprocessable Entity (validation errors)
- **500**: Internal Server Error

## Testing Checklist

### Authentication Tests

- [ ] Doctor registration
- [ ] Patient registration
- [ ] Pharmacist registration
- [ ] Admin registration
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Access protected routes with token
- [ ] Access protected routes without token
- [ ] Password update
- [ ] Get current user info

### Patient Management Tests

- [ ] Create patient (admin/doctor)
- [ ] Get all patients
- [ ] Get patient by ID
- [ ] Update patient details
- [ ] Update patient vitals
- [ ] Patient medical history
- [ ] Patient statistics

### Appointment Tests

- [ ] Create appointment
- [ ] Get appointments (filtered by role)
- [ ] Update appointment
- [ ] Cancel appointment
- [ ] Complete appointment
- [ ] Doctor schedule view
- [ ] Appointment statistics

### Prescription Tests

- [ ] Create prescription
- [ ] Get prescriptions
- [ ] QR code generation
- [ ] Prescription verification
- [ ] Prescription dispensing
- [ ] Drug interaction checking
- [ ] Prescription statistics

### Medical Records Tests

- [ ] Create medical record
- [ ] Get medical records
- [ ] Update medical record
- [ ] Finalize medical record
- [ ] Medical record amendments
- [ ] Patient medical history
- [ ] Medical record statistics

### Security Tests

- [ ] Role-based access control
- [ ] Rate limiting
- [ ] Data validation
- [ ] XSS protection
- [ ] SQL injection protection
- [ ] CORS functionality

## Common Testing Issues & Solutions

1. **Server not running**: Ensure `npm start` is executed
2. **Database connection**: Check MongoDB is running
3. **Invalid tokens**: Re-login to get fresh JWT tokens
4. **CORS errors**: Verify origin headers if testing from browser
5. **Rate limiting**: Wait if hitting rate limits (15 requests/minute for auth)

## Next Steps After Testing

1. Document any bugs found
2. Create automated test suite
3. Set up CI/CD pipeline
4. Prepare for frontend integration
5. Configure production environment
