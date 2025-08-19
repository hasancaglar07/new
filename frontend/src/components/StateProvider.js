"use client";

import { createContext, useContext, useReducer, useEffect } from 'react';

// State context
const StateContext = createContext();

// Initial state
const initialState = {
  // Ana sayfa state
  homepage: {
    searchQuery: '',
    activeTab: 'all',
    searchResults: null,
    isLoading: false,
    hasSearched: false
  },
  // Kitaplar sayfası state
  books: {
    searchTerm: '',
    selectedAuthor: 'all',
    filteredBooks: [],
    isLoading: false
  },
  // Makaleler sayfası state
  articles: {
    searchQuery: '',
    currentPage: 1,
    articles: [],
    totalPages: 0,
    isLoading: false
  },
  // Ses kayıtları sayfası state
  audio: {
    searchQuery: '',
    selectedAuthor: 'all',
    audioFiles: [],
    isLoading: false
  },
  // YouTube arama sayfası state
  youtube: {
    searchQuery: '',
    videos: [],
    isLoading: false
  }
};

// Action types
const actionTypes = {
  // Homepage actions
  SET_HOMEPAGE_SEARCH: 'SET_HOMEPAGE_SEARCH',
  SET_HOMEPAGE_TAB: 'SET_HOMEPAGE_TAB',
  SET_HOMEPAGE_RESULTS: 'SET_HOMEPAGE_RESULTS',
  SET_HOMEPAGE_LOADING: 'SET_HOMEPAGE_LOADING',
  
  // Books actions
  SET_BOOKS_SEARCH: 'SET_BOOKS_SEARCH',
  SET_BOOKS_AUTHOR: 'SET_BOOKS_AUTHOR',
  SET_BOOKS_RESULTS: 'SET_BOOKS_RESULTS',
  SET_BOOKS_LOADING: 'SET_BOOKS_LOADING',
  
  // Articles actions
  SET_ARTICLES_SEARCH: 'SET_ARTICLES_SEARCH',
  SET_ARTICLES_PAGE: 'SET_ARTICLES_PAGE',
  SET_ARTICLES_RESULTS: 'SET_ARTICLES_RESULTS',
  SET_ARTICLES_LOADING: 'SET_ARTICLES_LOADING',
  
  // Audio actions
  SET_AUDIO_SEARCH: 'SET_AUDIO_SEARCH',
  SET_AUDIO_AUTHOR: 'SET_AUDIO_AUTHOR',
  SET_AUDIO_RESULTS: 'SET_AUDIO_RESULTS',
  SET_AUDIO_LOADING: 'SET_AUDIO_LOADING',
  
  // YouTube actions
  SET_YOUTUBE_SEARCH: 'SET_YOUTUBE_SEARCH',
  SET_YOUTUBE_RESULTS: 'SET_YOUTUBE_RESULTS',
  SET_YOUTUBE_LOADING: 'SET_YOUTUBE_LOADING',
  
  // Global actions
  RESTORE_STATE: 'RESTORE_STATE',
  CLEAR_ALL_STATE: 'CLEAR_ALL_STATE'
};

// Reducer
function stateReducer(state, action) {
  switch (action.type) {
    // Homepage actions
    case actionTypes.SET_HOMEPAGE_SEARCH:
      return {
        ...state,
        homepage: {
          ...state.homepage,
          searchQuery: action.payload,
          hasSearched: action.payload.length > 0
        }
      };
    
    case actionTypes.SET_HOMEPAGE_TAB:
      return {
        ...state,
        homepage: {
          ...state.homepage,
          activeTab: action.payload
        }
      };
    
    case actionTypes.SET_HOMEPAGE_RESULTS:
      return {
        ...state,
        homepage: {
          ...state.homepage,
          searchResults: action.payload,
          isLoading: false
        }
      };
    
    case actionTypes.SET_HOMEPAGE_LOADING:
      return {
        ...state,
        homepage: {
          ...state.homepage,
          isLoading: action.payload
        }
      };
    
    // Books actions
    case actionTypes.SET_BOOKS_SEARCH:
      return {
        ...state,
        books: {
          ...state.books,
          searchTerm: action.payload
        }
      };
    
    case actionTypes.SET_BOOKS_AUTHOR:
      return {
        ...state,
        books: {
          ...state.books,
          selectedAuthor: action.payload
        }
      };
    
    case actionTypes.SET_BOOKS_RESULTS:
      return {
        ...state,
        books: {
          ...state.books,
          filteredBooks: action.payload,
          isLoading: false
        }
      };
    
    case actionTypes.SET_BOOKS_LOADING:
      return {
        ...state,
        books: {
          ...state.books,
          isLoading: action.payload
        }
      };
    
    // Articles actions
    case actionTypes.SET_ARTICLES_SEARCH:
      return {
        ...state,
        articles: {
          ...state.articles,
          searchQuery: action.payload
        }
      };
    
    case actionTypes.SET_ARTICLES_PAGE:
      return {
        ...state,
        articles: {
          ...state.articles,
          currentPage: action.payload
        }
      };
    
    case actionTypes.SET_ARTICLES_RESULTS:
      return {
        ...state,
        articles: {
          ...state.articles,
          articles: action.payload.articles,
          totalPages: action.payload.totalPages,
          isLoading: false
        }
      };
    
    case actionTypes.SET_ARTICLES_LOADING:
      return {
        ...state,
        articles: {
          ...state.articles,
          isLoading: action.payload
        }
      };
    
    // Audio actions
    case actionTypes.SET_AUDIO_SEARCH:
      return {
        ...state,
        audio: {
          ...state.audio,
          searchQuery: action.payload
        }
      };
    
    case actionTypes.SET_AUDIO_AUTHOR:
      return {
        ...state,
        audio: {
          ...state.audio,
          selectedAuthor: action.payload
        }
      };
    
    case actionTypes.SET_AUDIO_RESULTS:
      return {
        ...state,
        audio: {
          ...state.audio,
          audioFiles: action.payload,
          isLoading: false
        }
      };
    
    case actionTypes.SET_AUDIO_LOADING:
      return {
        ...state,
        audio: {
          ...state.audio,
          isLoading: action.payload
        }
      };
    
    // YouTube actions
    case actionTypes.SET_YOUTUBE_SEARCH:
      return {
        ...state,
        youtube: {
          ...state.youtube,
          searchQuery: action.payload
        }
      };
    
    case actionTypes.SET_YOUTUBE_RESULTS:
      return {
        ...state,
        youtube: {
          ...state.youtube,
          videos: action.payload,
          isLoading: false
        }
      };
    
    case actionTypes.SET_YOUTUBE_LOADING:
      return {
        ...state,
        youtube: {
          ...state.youtube,
          isLoading: action.payload
        }
      };
    
    // Global actions
    case actionTypes.RESTORE_STATE:
      return {
        ...state,
        ...action.payload
      };
    
    case actionTypes.CLEAR_ALL_STATE:
      return initialState;
    
    default:
      return state;
  }
}

// Provider component
export function StateProvider({ children }) {
  const [state, dispatch] = useReducer(stateReducer, initialState);

  // LocalStorage key
  const STORAGE_KEY = 'mihmandar_app_state';

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('State kaydetme hatası:', error);
    }
  }, [state]);

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        dispatch({ type: actionTypes.RESTORE_STATE, payload: parsedState });
      }
    } catch (error) {
      console.warn('State yükleme hatası:', error);
    }
  }, []);

  return (
    <StateContext.Provider value={{ state, dispatch, actionTypes }}>
      {children}
    </StateContext.Provider>
  );
}

// Hook to use state
export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within StateProvider');
  }
  return context;
}

// Helper hooks for specific pages
export function useHomepageState() {
  const { state, dispatch, actionTypes } = useAppState();
  return {
    ...state.homepage,
    setSearchQuery: (query) => dispatch({ type: actionTypes.SET_HOMEPAGE_SEARCH, payload: query }),
    setActiveTab: (tab) => dispatch({ type: actionTypes.SET_HOMEPAGE_TAB, payload: tab }),
    setSearchResults: (results) => dispatch({ type: actionTypes.SET_HOMEPAGE_RESULTS, payload: results }),
    setLoading: (loading) => dispatch({ type: actionTypes.SET_HOMEPAGE_LOADING, payload: loading })
  };
}

export function useBooksState() {
  const { state, dispatch, actionTypes } = useAppState();
  return {
    ...state.books,
    setSearchTerm: (term) => dispatch({ type: actionTypes.SET_BOOKS_SEARCH, payload: term }),
    setSelectedAuthor: (author) => dispatch({ type: actionTypes.SET_BOOKS_AUTHOR, payload: author }),
    setFilteredBooks: (books) => dispatch({ type: actionTypes.SET_BOOKS_RESULTS, payload: books }),
    setLoading: (loading) => dispatch({ type: actionTypes.SET_BOOKS_LOADING, payload: loading })
  };
}

export function useArticlesState() {
  const { state, dispatch, actionTypes } = useAppState();
  return {
    ...state.articles,
    setSearchQuery: (query) => dispatch({ type: actionTypes.SET_ARTICLES_SEARCH, payload: query }),
    setCurrentPage: (page) => dispatch({ type: actionTypes.SET_ARTICLES_PAGE, payload: page }),
    setArticlesResults: (results) => dispatch({ type: actionTypes.SET_ARTICLES_RESULTS, payload: results }),
    setLoading: (loading) => dispatch({ type: actionTypes.SET_ARTICLES_LOADING, payload: loading })
  };
}

export function useAudioState() {
  const { state, dispatch, actionTypes } = useAppState();
  return {
    ...state.audio,
    setSearchQuery: (query) => dispatch({ type: actionTypes.SET_AUDIO_SEARCH, payload: query }),
    setSelectedAuthor: (author) => dispatch({ type: actionTypes.SET_AUDIO_AUTHOR, payload: author }),
    setAudioFiles: (files) => dispatch({ type: actionTypes.SET_AUDIO_RESULTS, payload: files }),
    setLoading: (loading) => dispatch({ type: actionTypes.SET_AUDIO_LOADING, payload: loading })
  };
}

export function useYouTubeState() {
  const { state, dispatch, actionTypes } = useAppState();
  return {
    ...state.youtube,
    setSearchQuery: (query) => dispatch({ type: actionTypes.SET_YOUTUBE_SEARCH, payload: query }),
    setVideos: (videos) => dispatch({ type: actionTypes.SET_YOUTUBE_RESULTS, payload: videos }),
    setLoading: (loading) => dispatch({ type: actionTypes.SET_YOUTUBE_LOADING, payload: loading })
  };
}