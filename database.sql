-- ==============================================================
-- Estorvix – Real Estate Property Listing System Database Schema
-- Database: MySQL
-- Recommended tool: phpMyAdmin, MySQL Workbench, or mysql CLI
-- ==============================================================

CREATE DATABASE IF NOT EXISTS `estorvix_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `estorvix_db`;

-- -------------------------------------------------------------
-- Table: properties
-- Stores all real estate property listings
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `property_type` VARCHAR(50) NOT NULL, -- 'Apartment', 'Villa', 'Single Family Home', 'Studio', 'Penthouse', 'Townhouse'
  `price` DECIMAL(12, 2) NOT NULL,
  `location` VARCHAR(100) NOT NULL, -- City / Region
  `address` VARCHAR(255) NOT NULL,
  `bedrooms` INT NOT NULL DEFAULT 1,
  `bathrooms` INT NOT NULL DEFAULT 1,
  `area_sqft` INT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Sold', 'Rented'
  `rejection_reason` VARCHAR(500) NULL,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `image_url` VARCHAR(500) NOT NULL,
  `images` TEXT NULL, -- JSON array of secondary gallery images
  `amenities` TEXT NULL, -- Comma-separated or JSON list of features
  `year_built` INT NOT NULL DEFAULT 2022,
  `parking_spaces` INT NOT NULL DEFAULT 1,
  `agent_name` VARCHAR(100) NOT NULL DEFAULT 'Estorvix Advisory',
  `agent_phone` VARCHAR(40) NOT NULL DEFAULT '',
  `agent_email` VARCHAR(100) NOT NULL DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: inquiries
-- Stores customer inquiries and tour requests for properties
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `property_id` INT NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_email` VARCHAR(120) NOT NULL,
  `customer_phone` VARCHAR(40) NOT NULL,
  `message` TEXT NOT NULL,
  `preferred_contact` VARCHAR(30) NOT NULL DEFAULT 'Email', -- 'Email', 'Phone', 'WhatsApp'
  `schedule_tour` VARCHAR(30) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Accepted', 'Rejected', 'Contacted', 'Resolved'
  `rejection_reason` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inquiries_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Seed Initial Indian Property Listings
-- -------------------------------------------------------------
(1, 'New Town Luxury Family Villa', 'A spacious family villa in New Town, Kolkata, with bright open-plan living, a landscaped courtyard, a contemporary kitchen, and room for relaxed family gatherings.', 'Villa', 35000000.00, 'Kolkata, West Bengal', 'Action Area I, New Town', 5, 5, 4200, 'For Sale', 1, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80', '["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"]', 'Swimming Pool,Landscaped Courtyard,Modern Kitchen,Clubhouse,Private Garden,Security', 2023, 2, 'Estorvix Advisory', '', ''),
(2, 'Koregaon Park Luxury Penthouse', 'A premium Pune penthouse with an expansive private terrace, elegant interiors, generous natural light, and refined living spaces in the heart of Koregaon Park.', 'Penthouse', 48000000.00, 'Pune, Maharashtra', 'Koregaon Park, Pune', 3, 3, 2850, 'For Sale', 1, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80"]', 'Private Terrace,Concierge,Reserved Parking,Modern Kitchen,Fitness Centre,Rooftop Lounge', 2022, 2, 'Estorvix Advisory', '', ''),
(3, 'Whitefield Modern Family House', 'A welcoming Bengaluru family home with airy living and dining areas, a private garden, comfortable bedrooms, and convenient access to Whitefield schools and daily essentials.', 'Single Family Home', 27500000.00, 'Bengaluru, Karnataka', 'Whitefield Main Road, Whitefield', 4, 3, 3100, 'For Sale', 1, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80', '["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"]', 'Private Garden,Covered Patio,Walk-in Wardrobes,Reserved Parking,Children''s Play Area', 2021, 2, 'Estorvix Advisory', '', ''),
(4, 'Bandra Sea View Premium Apartment', 'A beautifully appointed Mumbai apartment with a sea-facing balcony, modern finishes, spacious bedrooms, and the lively dining and shopping of Bandra close by.', 'Apartment', 22500000.00, 'Mumbai, Maharashtra', 'Bandra West, Mumbai', 2, 2, 1250, 'For Sale', 0, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', '["https://images.unsplash.com/photo-1502005229762-ee152da915ba?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80"]', 'Sea View,Balcony,Elevator,Reserved Parking,Clubhouse,24-Hour Security', 2020, 1, 'Estorvix Advisory', '', ''),
(5, 'Dwarka Premium Residential Apartment', 'A comfortable New Delhi home in Dwarka with a practical family layout, a bright balcony, well-planned living spaces, and convenient access to local markets and transit.', 'Apartment', 12500000.00, 'New Delhi, Delhi', 'Sector 12, Dwarka', 3, 2, 1650, 'For Sale', 0, 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80', '["https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"]', 'Balcony,Elevator,Community Centre,Reserved Parking,Nearby Metro,Security', 2024, 1, 'Estorvix Advisory', '', ''),
(6, 'Candolim Coastal Apartment for Rent', 'A furnished Goa apartment close to Candolim Beach, with a breezy balcony, a bright living area, a modern kitchen, and easy access to local cafes and the shoreline.', 'Apartment', 85000.00, 'Goa', 'Candolim, North Goa', 2, 2, 1400, 'For Rent', 1, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80', '["https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80"]', 'Balcony,Beach Nearby,Swimming Pool,Parking,Furnished,High-Speed Internet', 2022, 1, 'Estorvix Advisory', '', ''),
(7, 'Koregaon Park Garden Studio for Rent', 'A well-planned Pune studio with a private balcony, practical storage, a modern kitchenette, and the cafes and everyday conveniences of Koregaon Park nearby.', 'Studio', 35000.00, 'Pune, Maharashtra', 'Koregaon Park, Pune', 1, 1, 620, 'For Rent', 0, 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1200&q=80', '["https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80"]', 'Built-in Storage,Balcony,Modern Kitchenette,Parking,Community Garden', 2023, 0, 'Estorvix Advisory', '', ''),
(8, 'Candolim Beachside Luxury Villa', 'A spacious Goan villa near Candolim Beach, featuring a private courtyard, a sunlit swimming pool, generous entertaining areas, and comfortable guest accommodation.', 'Villa', 55000000.00, 'Goa', 'Candolim, North Goa', 6, 6, 5400, 'For Sale', 1, 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80', '["https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"]', 'Private Courtyard,Swimming Pool,Guest Suite,Home Theatre,Landscaped Garden,Security', 2022, 3, 'Estorvix Advisory', '', '')
ON DUPLICATE KEY UPDATE
  title = VALUES(title), description = VALUES(description), property_type = VALUES(property_type),
  price = VALUES(price), location = VALUES(location), address = VALUES(address),
  bedrooms = VALUES(bedrooms), bathrooms = VALUES(bathrooms), area_sqft = VALUES(area_sqft),
  status = VALUES(status), featured = VALUES(featured), image_url = VALUES(image_url),
  images = VALUES(images), amenities = VALUES(amenities), year_built = VALUES(year_built),
  parking_spaces = VALUES(parking_spaces), agent_name = VALUES(agent_name),
  agent_phone = VALUES(agent_phone), agent_email = VALUES(agent_email);

-- Sample Initial Inquiry
INSERT INTO `inquiries` (`property_id`, `customer_name`, `customer_email`, `customer_phone`, `message`, `preferred_contact`, `schedule_tour`, `status`) VALUES
(1, 'Alexander Wright', 'alex.wright@example.com', '', 'Hello, I am interested in scheduling a viewing of the New Town Luxury Family Villa in Kolkata. Please share available times.', 'Email', '2026-11-14', 'Pending Review'),
(3, 'Sophia Chen', 'sophia.chen@example.com', '', 'Is the Whitefield Modern Family House in Bengaluru still available? Please share more details about the neighborhood.', 'Email', '2026-11-10', 'Contacted');
