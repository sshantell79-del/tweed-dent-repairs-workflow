# Tweed Dent Repairs Workflow - Product Requirements Document

## Original Problem Statement
Build a mobile/web app for a smash repairs business to manage cars coming in and out for repair work.

## Core Features
- **User Authentication**: JWT-based login/registration
- **Job Management**: Create, view, update status, delete jobs
- **Vehicle Information**: Registration, make, model, year, color, VIN
- **Owner Information**: Name, phone, email, address
- **Insurance Information**: Company, claim number, policy number
- **Damage Photos**: Upload and view photos of damage
- **AI Features**: License plate scanning, damage analysis
- **Quotes**: Category-based pricing matrix (Cat 1-5) for panels
- **Invoices**: Invoice management with GST calculation
- **Contacts**: Customer contact management
- **Activity Tracking**: Employee activity logging

## Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + React Router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT-4 Vision (via Emergent LLM Key)
- **3rd Party**: Xero integration for invoice syncing

## Architecture
```
/app
├── backend/          # FastAPI backend (stable)
│   └── server.py     # All API endpoints
└── web-frontend/     # React web app (NEW - replaces old Expo app)
    ├── src/
    │   ├── components/Layout.jsx
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Jobs.jsx
    │   │   ├── JobDetail.jsx
    │   │   ├── AddJob.jsx
    │   │   ├── Contacts.jsx
    │   │   ├── Quotes.jsx
    │   │   ├── Invoices.jsx
    │   │   └── Profile.jsx
    │   └── services/api.js
    └── vite.config.js
```

## What's Been Implemented (December 2025)

### Completed
- ✅ Full frontend migration from Expo (React Native) to React (Vite) web app
- ✅ User authentication (login/register) with JWT
- ✅ Dashboard with statistics and recent jobs
- ✅ Jobs list with search and status filtering
- ✅ Job detail view with all information sections
- ✅ Job status update via dropdown
- ✅ Add Job with multi-step form (Vehicle, Owner, Insurance, Job Details)
- ✅ AI plate scanning button (connected to backend)
- ✅ Contacts management (add, view, delete)
- ✅ Quotes with category-based panel pricing (Cat 1-5)
- ✅ Invoices with status filtering and detail modal
- ✅ Profile page with business info and logout
- ✅ Bottom tab navigation
- ✅ All pages tested and working

### Backend Features (Already Stable)
- ✅ All CRUD APIs for Jobs, Customers, Quotes, Invoices
- ✅ AI endpoints for plate scanning and damage analysis
- ✅ Xero OAuth2 integration
- ✅ Activity logging

## Preview URL
https://tweed-job-manager.preview.emergentagent.com

## Test Credentials
- Email: webuser@example.com
- Password: password123

## Pending/Future Tasks

### P1 - High Priority
- [ ] Test AI plate scanning end-to-end
- [ ] Test Xero integration end-to-end
- [ ] Add "Returning Customer" auto-fill feature

### P2 - Medium Priority
- [ ] Populate Settings page with actual settings
- [ ] Populate Notifications page with notification preferences
- [ ] Populate Help page with FAQ/support info

### P3 - Nice to Have
- [ ] Add photo upload to Add Job form
- [ ] Add invoice creation from job detail
- [ ] Add quote-to-job conversion
- [ ] Dark mode support

## Database Collections
- `users`: User accounts with hashed passwords
- `jobs`: Job records with vehicle, owner, insurance info
- `customers`: Customer contact information
- `quotes`: Quotes with line items and pricing
- `invoices`: Invoices with line items and GST
- `activity_log`: Employee activity records

## Key Decisions
1. **Migrated from Expo to React**: Due to Expo Go client instability and deployment limitations, the frontend was rebuilt as a standard React web app using Vite.
2. **Preserved Backend**: The FastAPI backend remained unchanged during migration.
3. **Bottom Navigation**: Mobile-friendly bottom tab navigation was maintained in the web version.
