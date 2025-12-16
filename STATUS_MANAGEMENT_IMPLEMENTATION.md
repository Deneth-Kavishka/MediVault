# Doctor Availability Status Management System - Implementation Summary

## Overview

Implemented a comprehensive status management system for doctor availability in the MediVault admin portal with the following statuses:

- **Active**: Available for booking by patients
- **Inactive**: Deactivated by admin, doctor can request reactivation or permanently delete
- **Finished**: Automatically set after the scheduled end time passes
- **Deleted**: Permanently deleted by doctor (soft delete with tracking)

## Database Schema Changes

### New Fields Added to `doctor_availability` table:

```sql
- deleted_at (TIMESTAMP): When the availability was permanently deleted
- deleted_by (VARCHAR): Who deleted it ('doctor' or 'admin')
- deactivated_by (VARCHAR): Who deactivated it ('admin')
- deactivated_at (TIMESTAMP): When admin deactivated it
```

### Migration File

- **File**: `migration_add_status_fields.sql`
- **Script**: `scripts/add-status-fields.ts` (to run the migration)

### Run Migration:

```bash
npm run tsx scripts/add-status-fields.ts
```

## Backend API Changes

### 1. Enhanced Toggle Endpoint (`/api/doctor-availability/:id/toggle`)

- **Access**: Admin only
- **Changes**:
  - Now tracks who deactivated (admin) and when
  - Clears deactivation tracking when reactivating
  - Enhanced notification to doctor mentions they can request reactivation or delete

### 2. Enhanced Delete Endpoint (`/api/doctor-availability/:id`)

- **Access**: Doctor or Admin
- **Doctor Behavior**:
  - Can only delete if admin deactivated it (isActive = false)
  - Cannot delete active availability
  - Performs soft delete (marks as 'deleted' status)
  - Notifies all admins about the deletion
- **Admin Behavior**:
  - Can perform hard delete (removes from database)

### 3. Auto-Finished Status (`/api/doctor-availability`)

- **Automatic Detection**: When fetching availability, automatically updates status to 'finished' if:
  - Current time > available date + end time
  - Status is not already 'finished' or 'deleted'

### 4. Existing Endpoints (unchanged):

- `/api/doctor-availability/:id/request-reactivation`: Doctor requests reactivation
- `/api/doctor-availability/:id/stats`: Get appointment statistics

## Admin Portal UI Changes

### Status Badge Display

- **Active**: Green badge
- **Inactive**: Orange badge
- **Finished**: Gray badge
- **Deleted**: Red badge

### Status Info Column (New)

Displays contextual information:

- **Deleted**: Shows who deleted and timestamp
- **Inactive**: Shows who deactivated and timestamp
- **Reactivation Requested**: Orange badge
- **Finished**: "Time elapsed" message

### Switch Behavior

- Disabled for 'finished' status
- Disabled for 'deleted' status
- Functional for 'active' and 'inactive' statuses

### Table Updates

- Changed "Request" column to "Status Info"
- Shows booked/total slots (e.g., "5/20")
- All status transitions properly reflected

## Doctor-Side UI Changes

### Availability Cards

- **Status Badge**: Shows Active/Inactive/Finished/Deleted with appropriate colors
- **Pending Request Badge**: Shows when reactivation is requested

### Deactivation Alert (New)

When admin deactivates availability:

- **Alert Box**: Orange-bordered warning box appears
- **Message**: Shows deactivation timestamp and admin action
- **Actions Available**:
  1. **Request Reactivation** button
     - Sends notification to all admins
     - Disabled if already requested
     - Shows "Request Pending" when submitted
  2. **Permanently Delete** button
     - Marks as deleted (soft delete)
     - Tracks deletion timestamp and who deleted
     - Notifies admins

### Button States

- **Edit**: Disabled for inactive/deleted/finished availability
- **Delete**: Disabled for active availability (can only delete if admin deactivated)

### New Mutation

- `requestReactivationMutation`: Handles reactivation requests to admin

## Status Lifecycle Flow

### 1. Active → Inactive (Admin Action)

- Admin toggles switch off in admin portal
- Status: `active` → `inactive`
- Fields set: `deactivatedBy = 'admin'`, `deactivatedAt = now()`
- Notification sent to doctor

### 2. Inactive → Reactivation Requested (Doctor Action)

- Doctor clicks "Request Reactivation" button
- Fields set: `reactivationRequested = true`, `reactivationRequestedAt = now()`
- Notification sent to all admins

### 3. Inactive → Active (Admin Action - Approve Reactivation)

- Admin toggles switch on
- Status: `inactive` → `active`
- Fields cleared: `deactivatedBy = null`, `deactivatedAt = null`, `reactivationRequested = false`
- Notification sent to doctor

### 4. Inactive → Deleted (Doctor Action)

- Doctor clicks "Permanently Delete" on deactivated availability
- Status: `inactive` → `deleted`
- Fields set: `deletedAt = now()`, `deletedBy = 'doctor'`
- Notification sent to all admins

### 5. Active → Finished (Automatic)

- System automatically detects when `availableDate + endTime < now()`
- Status: `active` → `finished`
- Happens on any availability fetch
- Cannot be toggled by anyone

### 6. Any Status → Hard Delete (Admin Action)

- Admin can completely remove record from database
- Only admins have this capability

## Notifications System

### Doctor Notifications

1. **Availability Deactivated**: When admin deactivates
2. **Availability Activated**: When admin reactivates

### Admin Notifications

1. **Reactivation Request**: When doctor requests reactivation
2. **Availability Deleted by Doctor**: When doctor permanently deletes

## Key Features

### For Admins:

✅ Toggle availability active/inactive
✅ See who deleted and when
✅ See who deactivated and when
✅ See pending reactivation requests
✅ Automatic finished status display
✅ Hard delete capability
✅ Notifications for doctor actions

### For Doctors:

✅ See deactivation alerts with timestamp
✅ Request reactivation with one click
✅ Permanently delete deactivated availability
✅ Visual status badges (Active/Inactive/Finished/Deleted)
✅ Cannot edit/delete active availability
✅ Notifications for admin actions

### Automatic Features:

✅ Finished status auto-updates when time passes
✅ Status synchronization across all parties
✅ Real-time UI updates with React Query
✅ Optimistic updates for better UX

## Files Modified

### Schema:

- `shared/schema.ts` - Added new fields to doctorAvailability table

### Backend:

- `server/routes.ts` - Updated toggle, delete, and fetch endpoints

### Frontend - Admin:

- `client/src/pages/admin-doctor-availability.tsx` - Enhanced UI with status info column

### Frontend - Doctor:

- `client/src/pages/doctor-availability.tsx` - Added deactivation alerts and actions

### Migration:

- `migration_add_status_fields.sql` - SQL migration for new fields
- `scripts/add-status-fields.ts` - Migration runner script

## Testing Checklist

- [ ] Run database migration
- [ ] Admin can deactivate availability
- [ ] Doctor receives deactivation notification
- [ ] Doctor can see deactivation alert in their portal
- [ ] Doctor can request reactivation
- [ ] Admin receives reactivation request notification
- [ ] Admin can approve reactivation (toggle on)
- [ ] Doctor can permanently delete deactivated availability
- [ ] Admin receives deletion notification
- [ ] Finished status automatically appears after end time
- [ ] Status badges display correctly everywhere
- [ ] All status transitions work correctly
- [ ] Notifications are sent to correct parties

## Notes

- All status changes are tracked with timestamps and actors
- Soft delete preserves data for admin reference
- Hard delete (admin only) removes data permanently
- Finished status is automatic and cannot be manually changed
- Doctors cannot delete active availability (must be deactivated by admin first)
- All notifications are real-time via the notification system
