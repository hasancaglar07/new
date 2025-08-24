// Global search state management context
"use client";

import { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  // YouTube Search State
  youtubeSearch: {
    query: '',
    selectedChannel: 'Tüm Kanallar',
    results: [],
    isLoading: false,
    error: null,
    searched: false,
    cacheStats: null
  },
  
  // Video Analysis State
  videoAnalysis: {
    url: '',
    currentAnalysisUrl: '',
    analysisResult: null,
    isLoading: false,
    error: null,
    history: [],
    filteredHistory: [],
    historyLoading: true,
    taskId: null,
    statusMessage: '',
    searchQuery: ''
  },
  
  // Books State
  books: {
    libraryData: [],
    isLoading: true,
    selectedAuthor: 'all',
    searchTerm: '',
    selectedBook: null,
    isModalOpen: false
  }
};

// Action types
const ActionTypes = {
  // YouTube Search Actions
  SET_YOUTUBE_QUERY: 'SET_YOUTUBE_QUERY',
  SET_YOUTUBE_CHANNEL: 'SET_YOUTUBE_CHANNEL',
  SET_YOUTUBE_RESULTS: 'SET_YOUTUBE_RESULTS',
  SET_YOUTUBE_LOADING: 'SET_YOUTUBE_LOADING',
  SET_YOUTUBE_ERROR: 'SET_YOUTUBE_ERROR',
  SET_YOUTUBE_SEARCHED: 'SET_YOUTUBE_SEARCHED',
  SET_YOUTUBE_CACHE_STATS: 'SET_YOUTUBE_CACHE_STATS',
  RESET_YOUTUBE_SEARCH: 'RESET_YOUTUBE_SEARCH',
  
  // Video Analysis Actions
  SET_VIDEO_URL: 'SET_VIDEO_URL',
  SET_VIDEO_ANALYSIS_RESULT: 'SET_VIDEO_ANALYSIS_RESULT',
  SET_VIDEO_LOADING: 'SET_VIDEO_LOADING',
  SET_VIDEO_ERROR: 'SET_VIDEO_ERROR',
  SET_VIDEO_HISTORY: 'SET_VIDEO_HISTORY',
  SET_VIDEO_SEARCH_QUERY: 'SET_VIDEO_SEARCH_QUERY',
  RESET_VIDEO_ANALYSIS: 'RESET_VIDEO_ANALYSIS',
  
  // Books Actions
  SET_BOOKS_DATA: 'SET_BOOKS_DATA',
  SET_BOOKS_LOADING: 'SET_BOOKS_LOADING',
  SET_BOOKS_AUTHOR: 'SET_BOOKS_AUTHOR',
  SET_BOOKS_SEARCH: 'SET_BOOKS_SEARCH',
  SET_SELECTED_BOOK: 'SET_SELECTED_BOOK',
  SET_BOOK_MODAL: 'SET_BOOK_MODAL',
  RESET_BOOKS: 'RESET_BOOKS'
};

// Reducer function
function searchReducer(state, action) {
  switch (action.type) {
    // YouTube Search Cases
    case ActionTypes.SET_YOUTUBE_QUERY:
      return {
        ...state,
        youtubeSearch: {
          ...state.youtubeSearch,
          query: action.payload
        }
      };
      
    case ActionTypes.SET_YOUTUBE_CHANNEL:
      return {
        ...state,
        youtubeSearch: {
          ...state.youtubeSearch,
          selectedChannel: action.payload
        }
      };
      
    case ActionTypes.SET_YOUTUBE_RESULTS:
      return {
        ...state,
        youtubeSearch: {
          ...state.youtubeSearch,
          results: action.payload,
          error: null
        }
      };
      
    case ActionTypes.SET_YOUTUBE_LOADING:
      return {
        ...state,
        youtubeSearch: {
          ...state.youtubeSearch,
          isLoading: action.payload
        }
      };
      
    case ActionTypes.SET_YOUTUBE_ERROR:
      return {
        ...state,
        youtubeSearch: {
          ...state.youtubeSearch,
          error: action.payload,
          isLoading: false
        }
      };
      
    case ActionTypes.SET_YOUTUBE_SEARCHED:
      return {
        ...state,
        youtubeSearch: {
          ...state.youtubeSearch,
          searched: action.payload
        }
      };
      
    case ActionTypes.SET_YOUTUBE_CACHE_STATS:
      return {
        ...state,
        youtubeSearch: {
          ...state.youtubeSearch,
          cacheStats: action.payload
        }
      };
      
    // Video Analysis Cases
    case ActionTypes.SET_VIDEO_URL:
      return {
        ...state,
        videoAnalysis: {
          ...state.videoAnalysis,
          url: action.payload
        }
      };
      
    case ActionTypes.SET_VIDEO_ANALYSIS_RESULT:
      return {
        ...state,
        videoAnalysis: {
          ...state.videoAnalysis,
          analysisResult: action.payload
        }
      };
      
    case ActionTypes.SET_VIDEO_LOADING:
      return {
        ...state,
        videoAnalysis: {
          ...state.videoAnalysis,
          isLoading: action.payload
        }
      };
      
    case ActionTypes.SET_VIDEO_ERROR:
      return {
        ...state,
        videoAnalysis: {
          ...state.videoAnalysis,
          error: action.payload,
          isLoading: false
        }
      };
      
    case ActionTypes.SET_VIDEO_HISTORY:
      return {
        ...state,
        videoAnalysis: {
          ...state.videoAnalysis,
          history: action.payload,
          historyLoading: false
        }
      };
      
    case ActionTypes.SET_VIDEO_SEARCH_QUERY:
      return {
        ...state,
        videoAnalysis: {
          ...state.videoAnalysis,
          searchQuery: action.payload
        }
      };
      
    // Books Cases
    case ActionTypes.SET_BOOKS_DATA:
      return {
        ...state,
        books: {
          ...state.books,
          libraryData: action.payload,
          isLoading: false
        }
      };
      
    case ActionTypes.SET_BOOKS_LOADING:
      return {
        ...state,
        books: {
          ...state.books,
          isLoading: action.payload
        }
      };
      
    case ActionTypes.SET_BOOKS_AUTHOR:
      return {
        ...state,
        books: {
          ...state.books,
          selectedAuthor: action.payload
        }
      };
      
    case ActionTypes.SET_BOOKS_SEARCH:
      return {
        ...state,
        books: {
          ...state.books,
          searchTerm: action.payload
        }
      };
      
    case ActionTypes.SET_SELECTED_BOOK:
      return {
        ...state,
        books: {
          ...state.books,
          selectedBook: action.payload
        }
      };
      
    case ActionTypes.SET_BOOK_MODAL:
      return {
        ...state,
        books: {
          ...state.books,
          isModalOpen: action.payload
        }
      };
      
    default:
      return state;
  }
}

// Create context
const SearchContext = createContext();

// Provider component
export function SearchProvider({ children }) {
  const [state, dispatch] = useReducer(searchReducer, initialState);
  
  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('searchState');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          // Restore non-loading states
          if (parsedState.youtubeSearch) {
            dispatch({ type: ActionTypes.SET_YOUTUBE_QUERY, payload: parsedState.youtubeSearch.query || '' });
            dispatch({ type: ActionTypes.SET_YOUTUBE_CHANNEL, payload: parsedState.youtubeSearch.selectedChannel || 'Tüm Kanallar' });
            dispatch({ type: ActionTypes.SET_YOUTUBE_RESULTS, payload: parsedState.youtubeSearch.results || [] });
            dispatch({ type: ActionTypes.SET_YOUTUBE_SEARCHED, payload: parsedState.youtubeSearch.searched || false });
          }
          if (parsedState.videoAnalysis) {
            dispatch({ type: ActionTypes.SET_VIDEO_URL, payload: parsedState.videoAnalysis.url || '' });
            dispatch({ type: ActionTypes.SET_VIDEO_SEARCH_QUERY, payload: parsedState.videoAnalysis.searchQuery || '' });
          }
          if (parsedState.books) {
            dispatch({ type: ActionTypes.SET_BOOKS_AUTHOR, payload: parsedState.books.selectedAuthor || 'all' });
            dispatch({ type: ActionTypes.SET_BOOKS_SEARCH, payload: parsedState.books.searchTerm || '' });
          }
        } catch (error) {
          console.error('Error loading saved state:', error);
        }
      }
    }
  }, []);
  
  // Save state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stateToSave = {
        youtubeSearch: {
          query: state.youtubeSearch.query,
          selectedChannel: state.youtubeSearch.selectedChannel,
          results: state.youtubeSearch.results,
          searched: state.youtubeSearch.searched
        },
        videoAnalysis: {
          url: state.videoAnalysis.url,
          searchQuery: state.videoAnalysis.searchQuery
        },
        books: {
          selectedAuthor: state.books.selectedAuthor,
          searchTerm: state.books.searchTerm
        }
      };
      localStorage.setItem('searchState', JSON.stringify(stateToSave));
    }
  }, [state]);
  
  return (
    <SearchContext.Provider value={{ state, dispatch, ActionTypes }}>
      {children}
    </SearchContext.Provider>
  );
}

// Custom hook to use the search context
export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

export { ActionTypes };