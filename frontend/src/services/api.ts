import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔥 AUTO LOGOUT ON 401
// Store reference to logout function (will be set by AuthContext)
let logoutHandler: (() => Promise<void>) | null = null;

export const setLogoutHandler = (handler: () => Promise<void>) => {
  logoutHandler = handler;
};

// Response interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      if (logoutHandler) {
        console.log('401 Unauthorized - Auto logout');
        await logoutHandler();
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Services API
export const servicesAPI = {
  getAll: () => api.get('/services'),
  getCategories: () => api.get('/services/categories'),
  getById: (id: string) => api.get(`/services/${id}`),
};

// Organizations API
export const organizationsAPI = {
  getAll: (params?: any) => api.get('/organizations', { params }),
  getById: (id: string) => api.get(`/organizations/${id}`),
  search: (params: any) => api.get('/organizations/search', { params }),
};

// Vehicles API
export const vehiclesAPI = {
  getMy: () => api.get('/vehicles/my'),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.patch(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

// Quotes API
export const quotesAPI = {
  getMy: () => api.get('/quotes/my'),
  getById: (id: string) => api.get(`/quotes/${id}`),
  create: (data: any) => api.post('/quotes', data),
  cancel: (id: string) => api.post(`/quotes/${id}/cancel`),
  accept: (quoteId: string, responseId: string) => api.post(`/quotes/${quoteId}/accept/${responseId}`),
  // Provider methods
  getIncoming: () => api.get('/quotes/incoming'),
  respond: (quoteId: string, data: any) => api.post(`/quotes/${quoteId}/respond`, data),
  // 🔥 Quick Request V5
  quickRequest: (data: any) => api.post('/quotes/quick', data),
  getQuickTypes: () => api.get('/quotes/quick/types'),
};

// Matching API
export const matchingAPI = {
  findNearby: (lat: number, lng: number, serviceId?: string, limit?: number) => 
    api.get('/matching/nearby', { params: { lat, lng, serviceId, limit } }),
  findProviders: (data: any) => api.post('/matching/providers', data),
  findRepeat: (serviceId?: string) => api.get('/matching/repeat', { params: { serviceId } }),
};

// Bookings API
export const bookingsAPI = {
  getMy: () => api.get('/bookings/my'),
  getById: (id: string) => api.get(`/bookings/${id}`),
  // Provider methods
  getIncoming: () => api.get('/bookings/incoming'),
  updateStatus: (id: string, status: string) => api.patch(`/bookings/${id}/status`, { status }),
};

// Payments API
export const paymentsAPI = {
  create: (bookingId: string) => api.post('/payments/create', { bookingId }),
  confirm: (paymentId: string) => api.post(`/payments/${paymentId}/confirm-mock`),
  getMy: () => api.get('/payments/my'),
};

// Reviews API
export const reviewsAPI = {
  create: (data: any) => api.post('/reviews', data),
  getByOrg: (orgId: string) => api.get(`/reviews/organization/${orgId}`),
  getByBooking: (bookingId: string) => api.get(`/reviews/booking/${bookingId}`),
  getMy: () => api.get('/reviews/my'),
};

// 🗺️ Map Decision Layer API
export const mapAPI = {
  getNearby: (lat: number, lng: number, radius?: number, limit?: number, filter?: string) =>
    api.get('/map/providers/nearby', { params: { lat, lng, radius, limit, filter } }),
  getViewport: (swLat: number, swLng: number, neLat: number, neLng: number, filter?: string) =>
    api.get('/map/providers/viewport', { params: { swLat, swLng, neLat, neLng, filter } }),
  getMatching: (lat: number, lng: number, serviceId?: string, urgency?: string, limit?: number) =>
    api.get('/map/providers/matching', { params: { lat, lng, serviceId, urgency, limit } }),
  getDirect: (providerId: string, lat: number, lng: number) =>
    api.get('/map/direct', { params: { providerId, lat, lng } }),
};

// Disputes API
export const disputesAPI = {
  create: (data: any) => api.post('/disputes', data),
  getMy: () => api.get('/disputes/my'),
};

// Favorites API
export const favoritesAPI = {
  getMy: () => api.get('/favorites/my'),
  add: (organizationId: string) => api.post('/favorites', { organizationId }),
  remove: (organizationId: string) => api.delete(`/favorites/${organizationId}`),
};

export default api;
