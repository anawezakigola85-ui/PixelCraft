/**
 * Dedicated TikTok pack. Every entry is vertical 9:16 and opens in the editor
 * with editable text/shape layers. The category is `TikTok` so the library
 * filter and Studio search can surface all of them instantly.
 */

import { makeTemplate as t } from './templateFactory'
import type { Template } from '../lib/types'

export const TIKTOK_TEMPLATES: Template[] = [
  t('tt-transition-challenge', 'Smooth Transition Challenge', 'TikTok', 'Viral Transition', ['Watch the transition', 'Same angle', 'New fit', 'No edit tricks'], ['#a371f7', '#22d3ee', '#ec4899', '#fbbf24']),
  t('tt-glow-up', 'Glow Up Era', 'TikTok', 'Confidence Glow', ['POV: your glow up', 'started silently', 'now they notice'], ['#22d3ee', '#7c3aed', '#fbbf24']),
  t('tt-grwm', 'Get Ready With Me', 'TikTok', 'GRWM Soft', ['GRWM', 'for the first day', 'no makeup look'], ['#f472b6', '#fbbf24', '#22d3ee']),
  t('tt-pov-story', 'POV Storytime', 'TikTok', 'Storytime Hook', ['POV: you said yes', 'to one more story', 'and it changed everything'], ['#8b5cf6', '#22d3ee', '#f43f5e']),
  t('tt-duet', 'Duet With Me', 'TikTok', 'Duet Prompt', ['Duet this', 'with your version', 'tag a friend'], ['#10b981', '#22d3ee', '#a371f7']),
  t('tt-greenscreen', 'Green Screen News', 'TikTok', 'Fake News Flash', ['Breaking news', 'your feed just changed', 'stay tuned'], ['#22d3ee', '#7c3aed', '#fbbf24']),
  t('tt-outfit', 'Outfit Transition', 'TikTok', 'Fit Switch', ['First fit', 'vs final fit', 'which one wins?'], ['#ec4899', '#a371f7', '#22d3ee']),
  t('tt-beforeafter', 'Before and After', 'TikTok', 'Satisfying Reveal', ['Before', 'After', 'same angle', 'swipe for the reveal'], ['#fbbf24', '#22d3ee', '#10b981']),
  t('tt-unboxing', 'Unboxing Hype', 'TikTok', 'Package Opening', ['Package arrived', 'lets open it', 'worth the hype?'], ['#a371f7', '#10b981', '#fbbf24']),
  t('tt-product', 'Product Review', 'TikTok', 'Honest Review', ['3 things I love', '1 thing I hate', 'link in bio'], ['#22d3ee', '#10b981', '#fbbf24']),
  t('tt-skincare', 'Skincare Routine', 'TikTok', 'Glass Skin', ['Night routine', 'glass skin steps', 'do not skip this'], ['#f472b6', '#22d3ee', '#10b981']),
  t('tt-workout', '7 Day Challenge', 'TikTok', 'Fitness Challenge', ['Day 1 of 7', 'no equipment', 'results by Sunday'], ['#f43f5e', '#22d3ee', '#fbbf24']),
  t('tt-mealprep', 'Meal Prep Sunday', 'TikTok', 'Quick Prep', ['3 meals', '30 minutes', 'zero excuses'], ['#10b981', '#fbbf24', '#22d3ee']),
  t('tt-recipe', '15 Second Recipe', 'TikTok', 'Fast Foodie', ['15 second snack', '3 ingredients', 'save this'], ['#fbbf24', '#f472b6', '#10b981']),
  t('tt-citywalk', 'City Walk Diaries', 'TikTok', 'Golden Hour Walk', ['Walk with me', 'through the city', 'golden hour'], ['#22d3ee', '#7c3aed', '#fbbf24']),
  t('tt-nightdrive', 'Night Drive', 'TikTok', 'Midnight Drive', ['Windows down', 'city lights on', 'voice notes only'], ['#7c3aed', '#22d3ee', '#f472b6']),
  t('tt-aesthetic', 'Aesthetic Montage', 'TikTok', 'Soft Edit', ['little moments', 'soft edits', 'that feel'], ['#f472b6', '#22d3ee', '#a371f7']),
  t('tt-dailyreminder', 'Daily Reminder', 'TikTok', 'Quote Tok', ['You are late', 'to your own life', 'start today'], ['#ffffff', '#a371f7', '#22d3ee']),
  t('tt-mindset', 'Mindset Shift', 'TikTok', 'Motivation Tok', ['Stop waiting', 'for the perfect moment', 'this is it'], ['#fbbf24', '#22d3ee', '#7c3aed']),
  t('tt-studytok', 'Study Tok', 'TikTok', 'Focus Session', ['Study with me', '25 minute focus', 'no distractions'], ['#a371f7', '#10b981', '#22d3ee']),
  t('tt-examweek', 'Exam Week', 'TikTok', 'Student Survival', ['Exam week', 'coffee in hand', 'we survive'], ['#fbbf24', '#f472b6', '#22d3ee']),
  t('tt-desksetup', 'Desk Setup Tour', 'TikTok', 'Tech Tok', ['My desk setup', 'under 200 dollars', 'everything linked'], ['#22d3ee', '#7c3aed', '#10b981']),
  t('tt-gamingclip', 'Gaming Clip', 'TikTok', 'Clutch Moment', ['Clutch or kick', 'one round left', 'watch this'], ['#f43f5e', '#22d3ee', '#a371f7']),
  t('tt-lyricvideo', 'Lyric Video', 'TikTok', 'Music Edit', ['Lyrics on screen', 'sing it louder', 'sound on'], ['#f472b6', '#a371f7', '#22d3ee']),
  t('tt-karaoke', 'Karaoke Night', 'TikTok', 'Sing Along', ['Song of the night', 'everyone joined', 'unexpected ending'], ['#fbbf24', '#f472b6', '#22d3ee']),
  t('tt-birthdaycountdown', 'Birthday Countdown', 'TikTok', 'Countdown Card', ['3 days left', 'birthday week', 'surprise planned'], ['#f472b6', '#fbbf24', '#10b981']),
  t('tt-couplegoals', 'Couple Goals', 'TikTok', 'Couple Edit', ['Little things', 'big feelings', 'tag your person'], ['#f472b6', '#f43f5e', '#22d3ee']),
  t('tt-pettok', 'Pet Tok', 'TikTok', 'Funny Pet', ['My dog reacted', 'to the word walk', 'instant zoomies'], ['#fbbf24', '#f472b6', '#10b981']),
  t('tt-funnyskit', 'Funny Skit', 'TikTok', 'Comedy Skit', ['When you say', 'I will be quick', 'and take 20 minutes'], ['#fbbf24', '#22d3ee', '#f472b6']),
  t('tt-quicktutorial', 'Quick Tutorial', 'TikTok', 'How To Hook', ['Learn this', 'in 20 seconds', 'save for later'], ['#22d3ee', '#10b981', '#a371f7']),
  t('tt-lifehack', 'Life Hack', 'TikTok', 'Try This Now', ['This changes everything', 'one simple trick', 'try it today'], ['#10b981', '#22d3ee', '#fbbf24']),
  t('tt-diyupgrade', 'DIY Upgrade', 'TikTok', 'Budget Makeover', ['Old thing', 'new look', 'zero budget'], ['#a371f7', '#fbbf24', '#10b981']),
  t('tt-cleanwithme', 'Clean With Me', 'TikTok', 'Reset Routine', ['10 minute reset', 'clean desk', 'clear mind'], ['#22d3ee', '#10b981', '#ffffff']),
  t('tt-streetwear', 'Streetwear Fit', 'TikTok', 'Fit Check', ['Streetwear check', 'layering done right', 'drop details'], ['#a371f7', '#22d3ee', '#fbbf24']),
  t('tt-foodiefind', 'Foodie Find', 'TikTok', 'Hidden Gem', ['Hidden gem', 'best bite in town', 'save this spot'], ['#fbbf24', '#f43f5e', '#10b981']),
  t('tt-cafehopping', 'Cafe Hopping', 'TikTok', 'Coffee Diary', ['Third cafe today', 'this one is different', 'order the latte'], ['#fbbf24', '#f472b6', '#22d3ee']),
  t('tt-travelreel', 'Travel Reel', 'TikTok', '48 Hour Guide', ['48 hours in', 'one city', 'full itinerary'], ['#22d3ee', '#10b981', '#fbbf24']),
  t('tt-5amclub', '5 AM Club', 'TikTok', 'Early Routine', ['5 AM club', 'quiet before chaos', 'win the morning'], ['#fbbf24', '#22d3ee', '#7c3aed']),
  t('tt-abs30', 'Abs in 30', 'TikTok', 'Quick Workout', ['30 second abs', 'no equipment', 'follow along'], ['#f43f5e', '#22d3ee', '#fbbf24']),
  t('tt-viralhook', 'Viral Hook Formula', 'TikTok', 'Retention Hook', ['Stop scrolling', 'this is for you', 'watch till the end'], ['#22d3ee', '#f472b6', '#a371f7']),
]

export default TIKTOK_TEMPLATES
