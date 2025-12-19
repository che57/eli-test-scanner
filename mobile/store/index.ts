import { configureStore } from '@reduxjs/toolkit';
import { testStripsApi } from './api/testStripsApi';
import healthReducer from './slices/healthSlice';

export const store = configureStore({
  reducer: {
    [testStripsApi.reducerPath]: testStripsApi.reducer,
    health: healthReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(testStripsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
