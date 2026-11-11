import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  PersistConfig,
  RootState,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authSlice from './slices/authSlice';
import walletSlice from './slices/walletSlice';
import transactionSlice from './slices/transactionSlice';

const rootPersistConfig: PersistConfig<RootState> = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'wallet', 'transactions'],
};

const rootReducer = combineReducers({
  auth: authSlice,
  wallet: walletSlice,
  transactions: transactionSlice,
});

const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
