# Marketplace Web Version

This is the web version of the Marketplace mobile app, focused on e-commerce functionality. It provides a responsive web interface for buying and selling products online.

## Features

### E-commerce Features
- **Product Browsing**: Browse products by categories with filtering options
- **Product Details**: Detailed product pages with image galleries, descriptions, and seller information
- **Search**: Search for products, brands, and categories
- **Shopping Cart**: Add products to cart and manage quantities
- **Wishlist**: Save favorite products for later
- **Seller Dashboard**: Manage products, track sales, and view analytics
- **User Authentication**: Login and registration with form validation
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Excluded Features
- Ride sharing services (as requested)
- Mobile-specific features (location services, push notifications, etc.)

## Technology Stack

- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Axios** - HTTP client for API calls
- **Date-fns** - Date manipulation library

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the web app directory:
   ```bash
   cd appWebVersion
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [https://api.cloudnexus.biz:3000](https://api.cloudnexus.biz:3000) to view it in the browser.

### Building for Production

```bash
npm run build
```

This builds the app for production to the `build` folder.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx
│   ├── WelcomeBanner.tsx
│   ├── SearchBar.tsx
│   ├── QuickActions.tsx
│   ├── ProductCategories.tsx
│   ├── FeaturedProducts.tsx
│   ├── PromotionsBanner.tsx
│   ├── RecentActivity.tsx
│   └── BottomNavigation.tsx
├── pages/              # Page components
│   ├── ProductListing.tsx
│   ├── ProductDetail.tsx
│   ├── SellerDashboard.tsx
│   ├── Login.tsx
│   └── Register.tsx
├── App.tsx             # Main app component with routing
├── index.tsx           # App entry point
└── index.css           # Global styles and Tailwind imports
```

## Key Components

### Home Page
- Welcome banner with call-to-action
- Search functionality
- Quick access actions
- Product categories
- Featured products
- Promotional banners
- Recent activity feed

### Product Listing
- Grid layout with product cards
- Category filtering
- Search functionality
- Product statistics (views, orders)
- Add to cart functionality

### Product Detail
- Image gallery with navigation
- Product information and specifications
- Seller information
- Quantity selector
- Add to cart and buy now buttons
- Related products

### Seller Dashboard
- Sales statistics and analytics
- Product management table
- Add/edit/delete products
- Order tracking
- Revenue metrics

## Styling

The app uses Tailwind CSS for styling with a custom color palette:
- Primary: Blue shades (#3B82F6, #2563EB, etc.)
- Secondary: Green shades for success states
- Gray scale for text and backgrounds

## API Integration

The app is designed to work with the existing backend API from the mobile app. Update the API endpoints in the service files to match your backend configuration.

## Responsive Design

The web app is fully responsive and works on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling
- Use semantic HTML elements

## Deployment

The app can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

Build the app and upload the contents of the `build` folder to your hosting service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Marketplace application suite.
