import { create } from 'zustand';

export const useHotelStore = create((set) => ({
  searchParams: {
    destination: '',
    checkIn: '',
    checkOut: '',
    numAdults: 1,
    numChildren: 0,
    numRooms: 1
  },
  
  hotels: [],
  selectedHotel: null,
  isLoading: false,
  error: null,
  
  setSearchParams: (params) => set((state) => ({
    searchParams: { ...state.searchParams, ...params }
  })),
  
  setHotels: (hotels) => set({ hotels }),
  
  setSelectedHotel: (hotel) => set({ selectedHotel: hotel }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  resetSearch: () => set({
    searchParams: {
      destination: '',
      checkIn: '',
      checkOut: '',
      numAdults: 1,
      numChildren: 0,
      numRooms: 1
    },
    hotels: [],
    selectedHotel: null,
    error: null
  })
}));

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  clearUser: () => set({ user: null, isAuthenticated: false })
}));