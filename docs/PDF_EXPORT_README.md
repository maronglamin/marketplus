# PDF Export Functionality

This document describes the PDF export functionality added to the SNAP app.

## Overview

The PDF export feature allows users to export their orders and interests data as professional PDF documents. The feature includes:

- Date range selection for filtering data
- Professional invoice/proforma document generation
- Download and sharing capabilities
- Support for both orders and interests

## Features

### Date Range Selection
- Calendar picker for start and end dates
- Quick selection options (Last 7 days, Last 30 days, Last 3 months, Last year)
- Validation to ensure start date is before end date
- Visual display of current export range

### PDF Generation
- Professional HTML template with company branding
- Responsive design that works well in PDF format
- Status badges with color coding
- Currency formatting
- Customer information display
- Date range information
- Total calculations

### Export Types

#### Orders Export
- Order number and date
- Product details and seller information
- Quantity and pricing
- Order status with color-coded badges
- Shipping method information
- Total amounts

#### Interests Export
- Product details
- Quantity and pricing
- Interest status with color-coded badges
- Creation date
- Total amounts

## Implementation

### Dependencies
- `expo-print`: For PDF generation
- `expo-sharing`: For sharing PDF files
- `expo-file-system`: For file system operations
- `@react-native-community/datetimepicker`: For date selection

### Components

#### PDFExportService
Located at: `src/services/pdfExportService.ts`
- Handles PDF generation using HTML templates
- Manages file creation and sharing
- Provides currency formatting utilities

#### DateRangePicker
Located at: `src/components/DateRangePicker.tsx`
- Modal component for date range selection
- Quick selection options
- Validation and error handling

### Integration

#### InterestManagement Screen
- Export button in header with calendar and download icons
- Date range display below header
- Filtering of interests by selected date range
- Loading states during export

#### CustomerOrders Screen
- Export button in header with calendar and download icons
- Date range display below header
- Filtering of orders by selected date range
- Loading states during export

## Usage

1. Navigate to either InterestManagement or CustomerOrders screen
2. Tap the calendar icon to select a date range
3. Choose from quick options or select custom dates
4. Tap the download icon to generate and export the PDF
5. The PDF will be generated and shared using the device's native sharing

## Backend Support

The backend APIs have been updated to support date range filtering:

- `GET /api/products/interests/user` - Added `startDate` and `endDate` query parameters
- `GET /api/orders/my-orders` - Added `startDate` and `endDate` query parameters

## Styling

The PDF uses a professional design with:
- Company branding (SNAP)
- Clean typography and spacing
- Color-coded status badges
- Responsive table layout
- Professional header and footer

## Error Handling

- Validates date ranges before export
- Shows appropriate error messages for failed exports
- Handles empty data scenarios
- Provides loading states during generation

## Future Enhancements

Potential improvements could include:
- Custom PDF templates
- Additional export formats (CSV, Excel)
- Email integration
- Cloud storage integration
- Batch export capabilities
- Custom branding options 