# E-Commerce-Website-
A comprehensive full-stack e-commerce web application built with Flask that provides a complete online shopping experience. The application features user authentication, product catalog browsing with advanced filtering, and a persistent shopping cart system that works for both anonymous and registered users.
Key Features

**User Management**
User Registration & Login - Secure account creation with email validation
JWT Authentication - Stateless authentication system with secure token management
Password Security - Werkzeug password hashing for secure credential storage
Session Persistence - Automatic login state management across browser sessions

**Product Catalog**
Product Browsing - Clean, organized display of products with detailed information
Advanced Filtering - Filter products by category, price range, and availability
Search Functionality - Real-time search across product names and descriptions
Category Organization - Products organized into Electronics, Home, Books, Clothing, and Sports
Stock Management - Real-time inventory tracking and out-of-stock indicators

Shopping Cart System
Persistent Cart - Cart items persist across browser sessions using localStorage for anonymous users
Database Storage - Registered users get server-side cart storage with cross-device synchronization
Automatic Merging - Anonymous cart items automatically merge with user account upon login
Quantity Management - Add, remove, and update item quantities with real-time total calculations
Cart Counter - Dynamic navigation badge showing current cart item count

**Customer Journey**
Browse Products - View catalog with filtering and search
Add to Cart - Select items and quantities (works without login)
Register/Login - Create account or sign in (cart items preserved)
Manage Cart - Update quantities, remove items, view totals
Checkout Ready - Cart management system ready for payment integration

**Backend**
Flask - Python web framework
SQLAlchemy - Database ORM 
Flask-JWT-Extended - JWT token authentication management
Werkzeug - Password hashing and security utilities

**Frontend**
HTML templates
Bootstrap 5.1.3 - Responsive CSS framework
Font Awesome 6.0 - Icon library for UI elements
Vanilla JavaScript - Client-side functionality and API interactions
Inter Font - Modern typography for professional appearance
