/**
 * CapCut-style video pack. Original layouts inspired by popular CapCut
 * editing trends — beat sync, transitions, captions, lyric and vlog cuts.
 */

import { makeTemplate as t } from './templateFactory'
import type { Template } from '../lib/types'

export const CAPCUT_TEMPLATES: Template[] = [
  t('capcut-beatsync', 'Beat Sync Edit', 'CapCut', 'Beat Drop', ['BEAT SYNC', 'feel the rhythm', 'cut on the kick'], ['#7C3AED', '#00E5FF', '#f472b6'], '9:16'),
  t('capcut-smoothzoom', 'Smooth Zoom Transition', 'CapCut', 'Seamless Cut', ['SMOOTH ZOOM', 'same motion', 'zero jump'], ['#00E5FF', '#7C3AED', '#ffffff'], '9:16'),
  t('capcut-speedramp', 'Speed Ramp', 'CapCut', 'Dynamic Speed', ['SPEED RAMP', 'slow then fast', 'watch the shift'], ['#f43f5e', '#00E5FF', '#fbbf24'], '9:16'),
  t('capcut-captionpop', 'Pop Captions', 'CapCut', 'Caption Style', ['POP CAPTIONS', 'bold and clear', 'sound on'], ['#ffffff', '#00E5FF', '#7C3AED'], '9:16'),
  t('capcut-lyrics', 'Lyric Video', 'CapCut', 'Music Lyrics', ['LYRICS', 'sing every word', 'on the beat'], ['#f472b6', '#7C3AED', '#00E5FF'], '9:16'),
  t('capcut-splitscreen', 'Split Screen', 'CapCut', 'Dual Frame', ['SPLIT SCREEN', 'two sides', 'one story'], ['#00E5FF', '#f43f5e', '#ffffff'], '9:16'),
  t('capcut-greenscreen', 'Green Screen Story', 'CapCut', 'Chroma Cut', ['GREEN SCREEN', 'anywhere we go', 'just imagine'], ['#10b981', '#00E5FF', '#7C3AED'], '9:16'),
  t('capcut-glitch', 'Glitch Cut', 'CapCut', 'Digital Effect', ['GLITCH', 'signal lost', 'find the pattern'], ['#00E5FF', '#f43f5e', '#7C3AED'], '9:16'),
  t('capcut-doubleexp', 'Double Exposure', 'CapCut', 'Layer Blend', ['DOUBLE EXPOSURE', 'two worlds', 'one frame'], ['#7C3AED', '#f472b6', '#00E5FF'], '9:16'),
  t('capcut-mirror', 'Mirror Transition', 'CapCut', 'Symmetry Cut', ['MIRROR', 'flip the frame', 'same energy'], ['#00E5FF', '#7C3AED', '#ffffff'], '9:16'),
  t('capcut-spin', 'Spin Transition', 'CapCut', 'Rotation Cut', ['SPIN TRANSITION', 'one take', 'full circle'], ['#fbbf24', '#00E5FF', '#7C3AED'], '9:16'),
  t('capcut-softfade', 'Soft Fade Edit', 'CapCut', 'Dreamy Cut', ['SOFT FADE', 'slow and calm', 'let it breathe'], ['#f472b6', '#a371f7', '#00E5FF'], '9:16'),
  t('capcut-vlogopener', 'Vlog Opener', 'CapCut', 'Weekly Vlog', ['THIS WEEK', 'a little recap', 'come with me'], ['#fbbf24', '#7C3AED', '#10b981'], '16:9'),
  t('capcut-trailer', 'Cinematic Trailer', 'CapCut', 'Film Trailer', ['A NEW STORY', 'begins tonight', 'watch closely'], ['#0a0a12', '#a371f7', '#00E5FF'], '16:9'),
  t('capcut-documentary', 'Documentary Title', 'CapCut', 'True Story', ['THE STORY', 'behind the scenes', 'real people'], ['#ffffff', '#7C3AED', '#00E5FF'], '16:9'),
  t('capcut-tutorial', 'Tutorial Overlay', 'CapCut', 'How To', ['STEP BY STEP', 'follow along', 'save this'], ['#10b981', '#00E5FF', '#7C3AED'], '16:9'),
  t('capcut-review', 'Product Review', 'CapCut', 'Honest Take', ['IS IT WORTH IT?', 'three things first', 'final verdict'], ['#00E5FF', '#10b981', '#fbbf24'], '9:16'),
  t('capcut-unboxing', 'Unboxing Cut', 'CapCut', 'Package Open', ['UNBOXING', 'first look', 'worth the wait'], ['#7C3AED', '#10b981', '#fbbf24'], '9:16'),
  t('capcut-food', 'Food Reel', 'CapCut', 'Foodie Cut', ['FOOD REEL', 'one bite away', 'recipe inside'], ['#fbbf24', '#f43f5e', '#10b981'], '9:16'),
  t('capcut-travel', 'Travel Diary', 'CapCut', 'Journey Cut', ['TRAVEL DIARY', 'day one of many', 'take me there'], ['#00E5FF', '#10b981', '#fbbf24'], '9:16'),
  t('capcut-fashion', 'Fashion Reel', 'CapCut', 'Fit Reel', ['FIT REEL', 'three looks', 'which one wins'], ['#ec4899', '#a371f7', '#00E5FF'], '9:16'),
  t('capcut-dance', 'Dance Challenge', 'CapCut', 'Dance Cut', ['DANCE CHALLENGE', 'learn the moves', 'tag a friend'], ['#f43f5e', '#00E5FF', '#fbbf24'], '9:16'),
  t('capcut-comedy', 'Comedy Timing', 'CapCut', 'Funny Cut', ['WAIT FOR IT', 'that moment', 'when you least expect'], ['#fbbf24', '#f472b6', '#00E5FF'], '9:16'),
  t('capcut-kineticquote', 'Kinetic Quote', 'CapCut', 'Text Motion', ['STAY WITH IT', 'the result comes', 'after the work'], ['#ffffff', '#7C3AED', '#00E5FF'], '9:16'),
  t('capcut-motivation', 'Motivational Edit', 'CapCut', 'Hype Cut', ['NO EXCUSES', 'start right now', 'future you thanks you'], ['#fbbf24', '#f43f5e', '#7C3AED'], '9:16'),
  t('capcut-study', 'Study Session', 'CapCut', 'Focus Cut', ['STUDY SESSION', 'quiet focus', 'one more chapter'], ['#a371f7', '#10b981', '#00E5FF'], '9:16'),
  t('capcut-gaming', 'Gaming Montage', 'CapCut', 'Highlight Cut', ['CLUTCH MOMENT', 'one round left', 'insane finish'], ['#f43f5e', '#00E5FF', '#7C3AED'], '16:9'),
  t('capcut-sports', 'Sports Highlight', 'CapCut', 'Action Cut', ['HIGHLIGHTS', 'the winning play', 'replay it again'], ['#10b981', '#00E5FF', '#fbbf24'], '16:9'),
  t('capcut-birthday', 'Birthday Montage', 'CapCut', 'Memory Cut', ['BIRTHDAY', 'all the moments', 'one big wish'], ['#f472b6', '#fbbf24', '#10b981'], '9:16'),
  t('capcut-outro', 'Channel Outro', 'CapCut', 'End Screen', ['THANKS FOR WATCHING', 'subscribe for more', 'see you next time'], ['#7C3AED', '#00E5FF', '#ffffff'], '16:9'),
]

export default CAPCUT_TEMPLATES
