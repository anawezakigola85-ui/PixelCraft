/**
 * Canva-style design pack. Original layouts inspired by popular Canva
 * categories — posts, presentations, flyers, cards, reports and covers.
 */

import { makeTemplate as t } from './templateFactory'
import type { Template } from '../lib/types'

export const CANVA_TEMPLATES: Template[] = [
  t('canva-brand-post', 'Minimal Brand Post', 'Canva', 'Clean Social', ['YOUR BRAND', 'simple. bold.', 'unmistakable.'], ['#7C3AED', '#00E5FF', '#FFFFFF']),
  t('canva-story-sale', 'Story Sale Banner', 'Canva', 'Story Promo', ['FLASH SALE', '48 hours only', 'up to 60% off'], ['#f43f5e', '#fbbf24', '#ffffff'], '9:16'),
  t('canva-pitch-title', 'Pitch Deck Title', 'Canva', 'Presentation', ['THE BIG IDEA', 'a clearer way forward', '2026'], ['#7C3AED', '#00E5FF', '#ffffff'], '16:9'),
  t('canva-pitch-section', 'Section Divider', 'Canva', 'Presentation', ['02 / STRATEGY', 'where we go next', 'three clear moves'], ['#00E5FF', '#7C3AED', '#ffffff'], '16:9'),
  t('canva-event-flyer', 'Event Flyer', 'Canva', 'Event Poster', ['CREATIVE NIGHT', 'November 28', 'doors open at 6'], ['#a371f7', '#f472b6', '#fbbf24'], '4:5'),
  t('canva-quote-poster', 'Quote Poster', 'Canva', 'Typography', ['Make it matter', 'before you make it loud.', 'Daily reminder'], ['#ffffff', '#7C3AED', '#00E5FF'], '4:5'),
  t('canva-business-card', 'Business Card', 'Canva', 'Corporate', ['ANA KIGOLA', 'Creative Director', 'hello@pixelcraft.studio'], ['#7C3AED', '#0B0C10', '#00E5FF']),
  t('canva-logo-minimal', 'Minimal Logo', 'Canva', 'Logo Mark', ['PIXEL', 'CRAFT', 'studio'], ['#00E5FF', '#7C3AED', '#ffffff']),
  t('canva-resume', 'Resume Header', 'Canva', 'Career', ['ANA KIGOLA', 'Product Designer', 'available for work'], ['#ffffff', '#7C3AED', '#00E5FF'], '4:5'),
  t('canva-certificate', 'Certificate', 'Canva', 'Award', ['CERTIFICATE', 'of completion', 'awarded with distinction'], ['#fbbf24', '#7C3AED', '#00E5FF'], '16:9'),
  t('canva-invitation', 'Invitation Card', 'Canva', 'Elegant', ['You are invited', 'to an evening', 'of ideas'], ['#f472b6', '#a371f7', '#fbbf24'], '4:5'),
  t('canva-menu', 'Cafe Menu', 'Canva', 'Menu Design', ['TODAYS MENU', 'coffee · pastry · calm', 'open 7am to 6pm'], ['#fbbf24', '#10b981', '#ffffff'], '4:5'),
  t('canva-infographic', 'Infographic Stats', 'Canva', 'Data Visual', ['72% creative', '28% routine', 'the numbers speak'], ['#00E5FF', '#7C3AED', '#10b981']),
  t('canva-growth-report', 'Growth Report', 'Canva', 'Business Report', ['Q4 GROWTH', 'up and to the right', 'full report inside'], ['#10b981', '#00E5FF', '#7C3AED'], '16:9'),
  t('canva-linkedin-banner', 'LinkedIn Banner', 'Canva', 'Profile Cover', ['DESIGN THAT WORKS', 'strategy · systems · story', 'let us connect'], ['#7C3AED', '#00E5FF', '#ffffff'], '16:9'),
  t('canva-youtube-thumb', 'YouTube Thumbnail', 'Canva', 'Thumbnail', ['WATCH THIS', 'before you start', 'full guide'], ['#f43f5e', '#fbbf24', '#ffffff'], '16:9'),
  t('canva-webinar', 'Webinar Cover', 'Canva', 'Online Event', ['FREE WEBINAR', 'build your brand', 'register now'], ['#7C3AED', '#00E5FF', '#f472b6'], '16:9'),
  t('canva-ebook-cover', 'Ebook Cover', 'Canva', 'Book Design', ['THE CREATIVE', 'playbook', 'volume one'], ['#a371f7', '#fbbf24', '#00E5FF'], '4:5'),
  t('canva-workshop', 'Workshop Poster', 'Canva', 'Class Promo', ['HANDS ON', 'design workshop', 'limited seats'], ['#00E5FF', '#7C3AED', '#ffffff'], '4:5'),
  t('canva-sale-banner', 'Sale Banner', 'Canva', 'Retail', ['BIG SALE', 'everything must go', 'ends Sunday'], ['#f43f5e', '#fbbf24', '#ffffff']),
  t('canva-thankyou', 'Thank You Card', 'Canva', 'Gratitude', ['THANK YOU', 'for being here', 'see you again'], ['#f472b6', '#fbbf24', '#7C3AED']),
  t('canva-wedding', 'Wedding Suite', 'Canva', 'Celebration', ['Together', 'in love and light', 'save the date'], ['#f472b6', '#ffffff', '#a371f7'], '4:5'),
  t('canva-birthday', 'Birthday Invite', 'Canva', 'Party', ['BIRTHDAY', 'weekend plans', 'bring your smile'], ['#fbbf24', '#f472b6', '#10b981'], '4:5'),
  t('canva-realestate', 'Property Listing', 'Canva', 'Real Estate', ['NEW LISTING', '3 bed · 2 bath', 'book a viewing'], ['#10b981', '#00E5FF', '#ffffff'], '4:5'),
  t('canva-restaurant', 'Restaurant Promo', 'Canva', 'Food Brand', ['FRESH TODAY', 'made with care', 'order now'], ['#f43f5e', '#fbbf24', '#10b981']),
  t('canva-fitness', 'Fitness Plan', 'Canva', 'Health', ['12 WEEK PLAN', 'stronger every day', 'start Monday'], ['#f43f5e', '#00E5FF', '#fbbf24'], '4:5'),
  t('canva-travel-board', 'Travel Board', 'Canva', 'Moodboard', ['SUMMER 2026', 'places to go', 'collect moments'], ['#00E5FF', '#10b981', '#fbbf24']),
  t('canva-class-schedule', 'Class Schedule', 'Canva', 'Education', ['THIS WEEK', 'mon to fri', 'all classes online'], ['#7C3AED', '#00E5FF', '#ffffff'], '4:5'),
  t('canva-fundraiser', 'Fundraiser', 'Canva', 'Community', ['GIVE A LITTLE', 'change a lot', 'donate today'], ['#10b981', '#fbbf24', '#7C3AED'], '4:5'),
  t('canva-app-launch', 'App Launch', 'Canva', 'Product', ['NOW LIVE', 'the new app', 'download today'], ['#00E5FF', '#7C3AED', '#ffffff']),
]

export default CANVA_TEMPLATES
