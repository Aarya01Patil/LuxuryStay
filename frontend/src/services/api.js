import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

export const authService = {
  processSession: async (sessionId) => {
    const response = await apiClient.post('/auth/session', { session_id: sessionId });
    return response.data;
  },
  
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  }
};

export const hotelService = {
  searchHotels: async (searchParams) => {
    const response = await apiClient.post('/hotels/search', searchParams);
    return response.data;
  },
  
  getHotelDetails: async (hotelId) => {
    const response = await apiClient.get(`/hotels/${hotelId}`);
    return response.data;
  }
};

export const bookingService = {
  createBooking: async (bookingData) => {
    const response = await apiClient.post('/bookings/create', bookingData);
    return response.data;
  },
  
  getUserBookings: async () => {
    const response = await apiClient.get('/bookings');
    return response.data;
  }
};

export const paymentService = {
  createCheckoutSession: async (bookingId, originUrl) => {
    const response = await apiClient.post('/payments/checkout/session', {
      booking_id: bookingId,
      origin_url: originUrl
    });
    return response.data;
  },
  
  getCheckoutStatus: async (sessionId) => {
    const response = await apiClient.get(`/payments/checkout/status/${sessionId}`);
    return response.data;
  }
};

export default apiClient;