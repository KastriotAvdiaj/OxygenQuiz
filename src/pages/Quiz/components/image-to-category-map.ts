// Category to image mapping for quiz cards
// Place corresponding images in your assets/images/categories/ folder

export interface CategoryImageData {
  image: string;
  gradient: string;
  iconColor: string;
  textColor: string;
}

export const categoryImageMap: Record<string, CategoryImageData> = {
  // STEM Categories
  'computer-science': {
    image: '/assets/images/categories/computer-science.jpg',
    gradient: 'from-blue-500/20 to-purple-500/20',
    iconColor: 'text-blue-500',
    textColor: 'text-blue-500 dark:text-blue-100'
  },
  'mathematics': {
    image: '/assets/images/categories/mathematics.jpg',
    gradient: 'from-green-500/20 to-teal-500/20',
    iconColor: 'text-green-500',
    textColor: 'text-green-500 dark:text-green-100'
  },
  'physics': {
    image: '/assets/images/categories/physics.jpg',
    gradient: 'from-purple-500/20 to-indigo-500/20',
    iconColor: 'text-purple-500',
    textColor: 'text-purple-500 dark:text-purple-100'
  },
  'chemistry': {
    image: '/assets/images/categories/chemistry.jpg',
    gradient: 'from-orange-500/20 to-red-500/20',
    iconColor: 'text-orange-500',
    textColor: 'text-orange-500 dark:text-orange-100'
  },
  'biology': {
    image: '/assets/images/categories/biology.jpg',
    gradient: 'from-emerald-500/20 to-green-500/20',
    iconColor: 'text-emerald-500',
    textColor: 'text-emerald-500 dark:text-emerald-100'
  },
  'engineering': {
    image: '/assets/images/categories/engineering.jpg',
    gradient: 'from-gray-500/20 to-slate-500/20',
    iconColor: 'text-gray-600',
    textColor: 'text-gray-500 dark:text-gray-100'
  },

  // Humanities & Social Sciences
  'history': {
    image: '/assets/categories/history.jpg',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-500 dark:text-amber-100'
  },
  'geography': {
    image: '/assets/images/categories/geography.jpg',
    gradient: 'from-emerald-500/20 to-blue-500/20',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-500 dark:text-emerald-100'
  },
  'literature': {
    image: '/assets/images/categories/literature.jpg',
    gradient: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-500 dark:text-purple-100'
  },
  'philosophy': {
    image: '/assets/images/categories/philosophy.jpg',
    gradient: 'from-slate-500/20 to-gray-500/20',
    iconColor: 'text-slate-600',
    textColor: 'text-slate-500 dark:text-slate-100'
  },
  'psychology': {
    image: '/assets/images/categories/psychology.jpg',
    gradient: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-500',
    textColor: 'text-rose-500 dark:text-rose-100'
  },
  'sociology': {
    image: '/assets/images/categories/sociology.jpg',
    gradient: 'from-indigo-500/20 to-blue-500/20',
    iconColor: 'text-indigo-500',
    textColor: 'text-indigo-500 dark:text-indigo-100'
  },

  // Languages
  'english': {
    image: '/assets/images/categories/english.jpg',
    gradient: 'from-red-500/20 to-blue-500/20',
    iconColor: 'text-red-600',
    textColor: 'text-red-500 dark:text-red-100'
  },
  'spanish': {
    image: '/assets/images/categories/spanish.jpg',
    gradient: 'from-red-500/20 to-yellow-500/20',
    iconColor: 'text-red-500',
    textColor: 'text-red-500 dark:text-red-100'
  },
  'french': {
    image: '/assets/images/categories/french.jpg',
    gradient: 'from-blue-500/20 to-red-500/20',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-500 dark:text-blue-100'
  },
  'german': {
    image: '/assets/images/categories/german.jpg',
    gradient: 'from-red-500/20 to-yellow-500/20',
    iconColor: 'text-red-600',
    textColor: 'text-red-500 dark:text-red-100'
  },

  // Arts & Culture
  'art': {
    image: '/assets/images/categories/art.jpg',
    gradient: 'from-pink-500/20 to-purple-500/20',
    iconColor: 'text-pink-500',
    textColor: 'text-pink-500 dark:text-pink-100'
  },
  'music': {
    image: '/assets/images/categories/music.jpg',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-500',
    textColor: 'text-violet-500 dark:text-violet-100'
  },
  'film': {
    image: '/assets/images/categories/film.jpg',
    gradient: 'from-yellow-500/20 to-orange-500/20',
    iconColor: 'text-yellow-600',
    textColor: 'text-yellow-500 dark:text-yellow-100'
  },

  // Business & Economics
  'business': {
    image: '/assets/images/categories/business.jpg',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-600',
    textColor: 'text-green-500 dark:text-green-100'
  },
  'economics': {
    image: '/assets/images/categories/economics.jpg',
    gradient: 'from-blue-500/20 to-green-500/20',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-500 dark:text-blue-100'
  },
  'finance': {
    image: '/assets/images/categories/finance.jpg',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-500 dark:text-emerald-100'
  },

  // Health & Medicine
  'medicine': {
    image: '/assets/images/categories/medicine.jpg',
    gradient: 'from-red-500/20 to-pink-500/20',
    iconColor: 'text-red-500',
    textColor: 'text-red-500 dark:text-red-100'
  },
  'health': {
    image: '/assets/images/categories/health.jpg',
    gradient: 'from-green-500/20 to-blue-500/20',
    iconColor: 'text-green-500',
    textColor: 'text-green-500 dark:text-green-100'
  },

  // Sports & Recreation
  'sports': {
    image: '/assets/images/categories/sports.jpg',
    gradient: 'from-orange-500/20 to-red-500/20',
    iconColor: 'text-orange-500',
    textColor: 'text-orange-500 dark:text-orange-100'
  },
  'fitness': {
    image: '/assets/images/categories/fitness.jpg',
    gradient: 'from-lime-500/20 to-green-500/20',
    iconColor: 'text-lime-600',
    textColor: 'text-lime-500 dark:text-lime-100'
  },

  // General Knowledge
  'general': {
    image: '/assets/images/categories/general.jpg',
    gradient: 'from-slate-500/20 to-zinc-500/20',
    iconColor: 'text-slate-600',
    textColor: 'text-slate-500 dark:text-slate-100'
  },
  'trivia': {
    image: '/assets/images/categories/trivia.jpg',
    gradient: 'from-rainbow-500/20 to-indigo-500/20',
    iconColor: 'text-indigo-500',
    textColor: 'text-indigo-500 dark:text-indigo-100'
  },

  // Technology
  'technology': {
    image: '/assets/images/categories/technology.jpg',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    iconColor: 'text-cyan-500',
    textColor: 'text-cyan-500 dark:text-cyan-100'
  },
  'programming': {
    image: '/assets/images/categories/programming.jpg',
    gradient: 'from-green-500/20 to-blue-500/20',
    iconColor: 'text-green-500',
    textColor: 'text-green-500 dark:text-green-100'
  },
  'youtube': {
    image: '/assets/images/categories/youtube.jpg',
    gradient: 'from-red-500/20 to-white-500/20',
    iconColor: 'text-red-500',
    textColor: 'text-red-500 dark:text-red-400'
  }
};

// Utility function to get category data with fallback
export function getCategoryImageData(category: string): CategoryImageData {
  // Normalize category name (lowercase, replace spaces with hyphens)
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '-');
  
  // Return category data or fallback to general
  return categoryImageMap[normalizedCategory] || categoryImageMap['general'];
}

// Utility function to check if image exists (you can implement this based on your setup)
export function getCategoryImageUrl(category: string): string {
  const categoryData = getCategoryImageData(category);
  return categoryData.image;
}

// Function to get just the gradient for cases where image fails to load
export function getCategoryGradient(category: string): string {
  const categoryData = getCategoryImageData(category);
  return categoryData.gradient;
}

// Function to get icon color for category
export function getCategoryIconColor(category: string): string {
  const categoryData = getCategoryImageData(category);
  return categoryData.iconColor;
}

// Function to get text color for category
export function getCategoryTextColor(category: string): string {
  const categoryData = getCategoryImageData(category);
  return categoryData.textColor;
}