import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { priceService } from '../../services/priceService';
import { walletService } from '../../services/walletService';

/**
 * ============================================================================
 * WALLET SLICE
 * ============================================================================
 *
 * PURPOSE: Manage all wallet-related state in Redux
 *
 * STATE INCLUDES:
 * - User balances (cash, tokens)
 * - Current gold price
 * - Previous gold price (for last movement calculation)
 * - Portfolio tracking (initial value for P&L)
 * - Price history (for charts)
 * - Daily change base price (for dashboard change display)
 * - Loading and error states
 *
 * ACTIONS (async thunks):
 * - initializeWallet: Set up price service
 * - fetchWalletData: Get user's balances from Firebase
 * - startHybridPriceSystem: Start price updates
 * - stopHybridPriceSystem: Stop and clean up
 * - fetchPriceHistory: Get historical prices
 * - updateWalletInFirestore: Save new balances
 *
 * SELECTORS (computed values):
 * - selectPortfolioValue: Total worth calculation
 * - selectProfitLoss: P&L with percentage
 * - selectDayChange: start-of-day price change
 * - selectLastPriceChange: current price vs previous price change
 * ============================================================================
 */

// ============================================================================
// TYPES: Define the shape of our wallet state
// ============================================================================
interface WalletState {
  /** How much cash the user has (default: $10,000) */
  cashBalance: number;

  /** How many gold tokens the user owns (default: 0) */
  tokenBalance: number;

  /** Current price of gold per gram */
  currentGoldPrice: number;

  /** Previous gold price before the latest update */
  previousGoldPrice: number;

  /** User's initial cash balance (for P&L calculation) */
  initialBalance: number;

  /** User's initial portfolio value (for P&L calculation) */
  initialPortfolioValue: number;

  /** Historical price data for charts */
  priceHistory: Array<{ price: number; timestamp: number }>;

  /** Baseline price used to calculate today's change */
  dayChangeBasePrice: number | null;

  /** Which day the current day-change baseline belongs to */
  dayChangeBaseDate: string | null;

  /** Is wallet data currently loading? */
  isLoading: boolean;

  /** Is price data currently loading? */
  isPriceLoading: boolean;

  /** Error message if something went wrong */
  error: string | null;

  /** When was the price last updated? */
  lastPriceUpdate: number | null;
}

let priceListenerUnsubscribeRef: (() => void) | null = null;
let walletListenerUnsubscribeRef: (() => void) | null = null;

// ============================================================================
// INITIAL STATE: Default values when app first loads
// ============================================================================
const initialState: WalletState = {
  cashBalance: 10000,           // Start with $10,000 virtual cash
  tokenBalance: 0,               // Start with 0 tokens
  currentGoldPrice: 65.5,        // Starting gold price
  previousGoldPrice: 65.5,       // Previous price for last movement
  initialBalance: 10000,         // Remember initial cash
  initialPortfolioValue: 10000,  // Remember initial portfolio value
  priceHistory: [],              // No history yet
  dayChangeBasePrice: null,      // No daily baseline yet
  dayChangeBaseDate: null,       // No baseline date yet
  isLoading: false,              // Not loading
  isPriceLoading: false,         // Not loading
  error: null,                   // No errors
  lastPriceUpdate: null,         // No updates yet
};

// ============================================================================
// ASYNC THUNKS: Actions that do async work (database, services)
// ============================================================================

// ----------------------------------------------------------------------------
// THUNK: initializeWallet
// PURPOSE: Set up the price service when app starts
// Firebase calls: 1 read (fetches current price)
// ----------------------------------------------------------------------------
export const initializeWallet = createAsyncThunk(
  'wallet/initialize',
  async (_, { rejectWithValue }) => {
    try {
      // Initialize price service (fetches from Firebase once)
      const initialPrice = await priceService.initialize();

      return { price: initialPrice };
    } catch (error: any) {
      // If something goes wrong, return the error message
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: fetchWalletData
// PURPOSE: Get user's wallet data from Firebase
// PARAMS: uid - User ID
// Firebase calls: 1 read
// ----------------------------------------------------------------------------
export const fetchWalletData = createAsyncThunk(
  'wallet/fetchData',
  async (uid: string, { rejectWithValue }) => {
    try {
      // Get wallet balances from Firebase
      const walletData = await walletService.getUserWallet(uid);

      // Get current price from memory (no Firebase call!)
      const currentPrice = priceService.getCurrentPrice();

      // Calculate initial portfolio value for P&L tracking
      const portfolioValue =
        walletData.cashBalance + walletData.tokenBalance * currentPrice;

      return {
        cashBalance: walletData.cashBalance,
        tokenBalance: walletData.tokenBalance,
        currentPrice: currentPrice,
        initialPortfolioValue: portfolioValue,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: startHybridPriceSystem
// PURPOSE: Start automatic price updates (local + sync)
// PARAMS:
//   localUpdateSeconds: How often to update locally (default: 10)
//   syncSeconds: How often to sync to Firebase (default: 60)
// Firebase calls: 1 read initially, then 1 read + 1 write per sync
// ----------------------------------------------------------------------------
export const startHybridPriceSystem = createAsyncThunk(
  'wallet/startHybrid',
  async (
    {
      localUpdateSeconds = 10,
      syncSeconds = 60,
    }: { localUpdateSeconds?: number; syncSeconds?: number },
    { rejectWithValue, dispatch }
  ) => {
    try {
      // Step 1: Start the hybrid price system in priceService
      await priceService.start(localUpdateSeconds, syncSeconds);

      // Step 2: Subscribe to price changes
      // This function will be called every time price changes
      const unsubscribe = priceService.subscribe((price, source) => {
        // Dispatch action to update Redux state
        dispatch(setGoldPrice({ price, source }));
      });

      // Step 3: Store unsubscribe outside Redux so actions/state stay serializable
      priceListenerUnsubscribeRef = unsubscribe;

      return {};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: stopHybridPriceSystem
// PURPOSE: Stop price updates and clean up
// IMPORTANT: Always call this when stopping/unmounting to prevent memory leaks
// ----------------------------------------------------------------------------
export const stopHybridPriceSystem = createAsyncThunk(
  'wallet/stopHybrid',
  async (_, { rejectWithValue }) => {
    try {
      if (priceListenerUnsubscribeRef) {
        priceListenerUnsubscribeRef();
        priceListenerUnsubscribeRef = null;
      }

      // Stop the price service (clears intervals, etc.)
      priceService.stop();

      return {};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: forcePriceSync
// PURPOSE: Manually trigger a sync to Firebase
// USE CASE: Testing, important events, manual refresh
// Firebase calls: 1 write
// ----------------------------------------------------------------------------
export const forcePriceSync = createAsyncThunk(
  'wallet/forceSync',
  async (_, { rejectWithValue }) => {
    try {
      await priceService.forceSync();
      return {};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: listenToWalletUpdates
// PURPOSE: Listen for real-time wallet balance changes from Firebase
// PARAMS: uid - User ID
// Firebase calls: 1 read initially, then triggered on changes
// ----------------------------------------------------------------------------
export const listenToWalletUpdates = createAsyncThunk(
  'wallet/listenWallet',
  async (uid: string, { dispatch, rejectWithValue }) => {
    try {
      if (walletListenerUnsubscribeRef) {
        walletListenerUnsubscribeRef();
      }

      // Subscribe to wallet changes
      walletListenerUnsubscribeRef = walletService.subscribeToWallet(
        uid,
        data => {
          // When wallet changes, update Redux state
          dispatch(updateWalletBalance({
            cashBalance: data.cashBalance,
            tokenBalance: data.tokenBalance,
          }));
        }
      );

      return {};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const stopWalletUpdates = createAsyncThunk(
  'wallet/stopWalletUpdates',
  async (_, { rejectWithValue }) => {
    try {
      if (walletListenerUnsubscribeRef) {
        walletListenerUnsubscribeRef();
        walletListenerUnsubscribeRef = null;
      }

      return {};
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: fetchPriceHistory
// PURPOSE: Get historical price data for charts (Milestone 5)
// PARAMS: limit - Maximum number of data points (default: 50)
// Firebase calls: 1 read
// ----------------------------------------------------------------------------
export const fetchPriceHistory = createAsyncThunk(
  'wallet/fetchPriceHistory',
  async (limit: number = 50, { rejectWithValue }) => {
    try {
      const history = await priceService.getPriceHistory(limit);
      return { history };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: fetchDayChangeBasePrice
// PURPOSE: Get the minimum history needed to calculate today's change
// FIREBASE CALLS: 1 read if today's first point exists, otherwise 2 reads
// ----------------------------------------------------------------------------
export const fetchDayChangeBasePrice = createAsyncThunk(
  'wallet/fetchDayChangeBasePrice',
  async (_, { rejectWithValue }) => {
    try {
      const basePrice = await priceService.getDayChangeBasePrice();
      return { basePrice };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: updateWalletInFirestore
// PURPOSE: Save new wallet balances to Firebase
// PARAMS: uid, cashBalance, tokenBalance
// Firebase calls: 1 write
// ----------------------------------------------------------------------------
export const updateWalletInFirestore = createAsyncThunk(
  'wallet/updateFirestore',
  async (
    {
      uid,
      cashBalance,
      tokenBalance,
    }: { uid: string; cashBalance: number; tokenBalance: number },
    { rejectWithValue }
  ) => {
    try {
      await walletService.updateUserWallet(uid, { cashBalance, tokenBalance });
      return { cashBalance, tokenBalance };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const claimEmergencyFunds = createAsyncThunk(
  'wallet/claimEmergencyFunds',
  async (
    { uid, amount = 10000 }: { uid: string; amount?: number },
    { rejectWithValue }
  ) => {
    try {
      return await walletService.addEmergencyFunds(uid, amount);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: buyTokens
// PURPOSE: Purchase gold tokens with cash
// PARAMS:
//   uid - User ID
//   amountInCash - How much cash to spend (in dollars)
// Firebase calls: 1 write (wallet) + 1 write (transaction)
// ----------------------------------------------------------------------------
export const buyTokens = createAsyncThunk(
  'wallet/buyTokens',
  async (
    {
      uid,
      amountInCash,
    }: { uid: string; amountInCash: number },
    { getState, rejectWithValue }
  ) => {
    try {
      // Get current state for wallet data and price
      const state = getState() as { wallet: WalletState };
      const currentPrice = state.wallet.currentGoldPrice;
      const currentCash = state.wallet.cashBalance;
      const currentTokens = state.wallet.tokenBalance;

      // Calculate how many tokens we can buy
      const tokensToBuy = amountInCash / currentPrice;

      // Validate: Check if user has enough cash
      if (currentCash < amountInCash) {
        return rejectWithValue('Insufficient cash balance');
      }

      // Calculate new balances
      const newCashBalance = currentCash - amountInCash;
      const newTokenBalance = currentTokens + tokensToBuy;

      // Update wallet in Firestore
      await walletService.updateUserWallet(uid, {
        cashBalance: newCashBalance,
        tokenBalance: newTokenBalance,
      });

      // Record the transaction
      await walletService.recordTransaction(uid, {
        type: 'BUY',
        tokens: tokensToBuy,
        pricePerToken: currentPrice,
        totalValue: amountInCash,
      });

      return {
        cashBalance: newCashBalance,
        tokenBalance: newTokenBalance,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: sellTokens
// PURPOSE: Sell gold tokens for cash
// PARAMS:
//   uid - User ID
//   tokenAmount - How many tokens to sell
// Firebase calls: 1 write (wallet) + 1 write (transaction)
// ----------------------------------------------------------------------------
export const sellTokens = createAsyncThunk(
  'wallet/sellTokens',
  async (
    {
      uid,
      tokenAmount,
    }: { uid: string; tokenAmount: number },
    { getState, rejectWithValue }
  ) => {
    try {
      // Get current state for wallet data and price
      const state = getState() as { wallet: WalletState };
      const currentPrice = state.wallet.currentGoldPrice;
      const currentCash = state.wallet.cashBalance;
      const currentTokens = state.wallet.tokenBalance;

      // Calculate cash value of tokens
      const cashValue = tokenAmount * currentPrice;

      // Validate: Check if user has enough tokens
      if (currentTokens < tokenAmount) {
        return rejectWithValue('Insufficient token balance');
      }

      // Calculate new balances
      const newCashBalance = currentCash + cashValue;
      const newTokenBalance = currentTokens - tokenAmount;

      // Update wallet in Firestore
      await walletService.updateUserWallet(uid, {
        cashBalance: newCashBalance,
        tokenBalance: newTokenBalance,
      });

      // Record the transaction
      await walletService.recordTransaction(uid, {
        type: 'SELL',
        tokens: tokenAmount,
        pricePerToken: currentPrice,
        totalValue: cashValue,
      });

      return {
        cashBalance: newCashBalance,
        tokenBalance: newTokenBalance,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ----------------------------------------------------------------------------
// THUNK: transferTokens
// PURPOSE: Send gold tokens to another user
// PARAMS:
//   senderId - Sender's User ID
//   receiverEmail - Recipient's email address
//   tokenAmount - How many tokens to transfer
// Firebase calls: 2 reads (check user, get IDs) + 4 writes in one transaction
// ----------------------------------------------------------------------------
export const transferTokens = createAsyncThunk(
  'wallet/transferTokens',
  async (
    {
      senderId,
      receiverEmail,
      tokenAmount,
    }: { senderId: string; receiverEmail: string; tokenAmount: number },
    { getState, rejectWithValue }
  ) => {
    try {
      // Get current state for wallet data and price
      const state = getState() as { wallet: WalletState };
      const currentPrice = state.wallet.currentGoldPrice;
      const currentTokens = state.wallet.tokenBalance;
      const currentCash = state.wallet.cashBalance;

      // Validate: Check if sender has enough tokens
      if (currentTokens < tokenAmount) {
        return rejectWithValue('Insufficient token balance');
      }

      // Validate: Cannot transfer to yourself
      // (We'll check this after getting receiver info)

      // Step 1: Check if receiver exists
      const receiverExists = await walletService.userExists(receiverEmail);
      if (!receiverExists) {
        return rejectWithValue('Recipient not found');
      }

      // Step 2: Get receiver's User ID
      const receiverId = await walletService.getUserIdByEmail(receiverEmail);
      if (!receiverId) {
        return rejectWithValue('Could not find recipient ID');
      }

      // Step 3: Validate: Cannot transfer to yourself
      if (senderId === receiverId) {
        return rejectWithValue('Cannot transfer to yourself');
      }

      const transferResult = await walletService.transferTokensAtomic({
        senderId,
        receiverId,
        receiverEmail,
        tokenAmount,
        pricePerToken: currentPrice,
      });

      return {
        cashBalance: transferResult.cashBalance ?? currentCash,
        tokenBalance: transferResult.tokenBalance,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ============================================================================
// SLICE: Define reducers and extra reducers
// ============================================================================
const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    // ------------------------------------------------------------------------
    // REDUCER: setGoldPrice
    // PURPOSE: Update current gold price in state
    // ------------------------------------------------------------------------
    setGoldPrice: (
      state,
      action: PayloadAction<{ price: number; source: 'local' | 'sync' }>
    ) => {
      const todayKey = new Date().toDateString();
      state.previousGoldPrice = state.currentGoldPrice;
      state.currentGoldPrice = action.payload.price;
      state.lastPriceUpdate = Date.now();
      if (
        state.dayChangeBasePrice === null ||
        state.dayChangeBaseDate !== todayKey
      ) {
        state.dayChangeBasePrice = action.payload.price;
        state.dayChangeBaseDate = todayKey;
      }
    },

    // ------------------------------------------------------------------------
    // REDUCER: updateWalletBalance
    // PURPOSE: Update cash and/or token balances
    // ------------------------------------------------------------------------
    updateWalletBalance: (
      state,
      action: PayloadAction<{
        cashBalance?: number;
        tokenBalance?: number;
      }>
    ) => {
      // Update cash balance if provided
      if (action.payload.cashBalance !== undefined) {
        state.cashBalance = action.payload.cashBalance;
      }
      // Update token balance if provided
      if (action.payload.tokenBalance !== undefined) {
        state.tokenBalance = action.payload.tokenBalance;
      }
    },

    // ------------------------------------------------------------------------
    // REDUCER: setInitialPortfolioValue
    // PURPOSE: Set the initial portfolio value (for P&L calculation)
    // ------------------------------------------------------------------------
    setInitialPortfolioValue: (state, action: PayloadAction<number>) => {
      state.initialPortfolioValue = action.payload;
    },

    // ------------------------------------------------------------------------
    // REDUCER: clearError
    // PURPOSE: Clear any error messages
    // ------------------------------------------------------------------------
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // =======================================================================
      // HANDLE: initializeWallet
      // =======================================================================
      .addCase(initializeWallet.pending, state => {
        state.isPriceLoading = true;
        state.error = null;
      })
      .addCase(initializeWallet.fulfilled, (state, action) => {
        state.isPriceLoading = false;
        state.previousGoldPrice = action.payload.price;
        state.currentGoldPrice = action.payload.price;
      })
      .addCase(initializeWallet.rejected, (state, action) => {
        state.isPriceLoading = false;
        state.error = action.payload as string;
      })

      // =======================================================================
      // HANDLE: fetchWalletData
      // =======================================================================
      .addCase(fetchWalletData.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWalletData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cashBalance = action.payload.cashBalance;
        state.tokenBalance = action.payload.tokenBalance;
        state.previousGoldPrice = action.payload.currentPrice;
        state.currentGoldPrice = action.payload.currentPrice;
        state.initialPortfolioValue = action.payload.initialPortfolioValue;
        state.initialBalance = action.payload.cashBalance;
      })
      .addCase(fetchWalletData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // =======================================================================
      // HANDLE: startHybridPriceSystem
      // =======================================================================
      .addCase(startHybridPriceSystem.fulfilled, () => {})
      .addCase(startHybridPriceSystem.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // =======================================================================
      // HANDLE: stopHybridPriceSystem
      // =======================================================================
      .addCase(stopHybridPriceSystem.fulfilled, () => {
        priceListenerUnsubscribeRef = null;
      })
      .addCase(stopHybridPriceSystem.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // =======================================================================
      // HANDLE: stopWalletUpdates
      // =======================================================================
      .addCase(stopWalletUpdates.fulfilled, () => {
        walletListenerUnsubscribeRef = null;
      })
      .addCase(stopWalletUpdates.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // =======================================================================
      // HANDLE: fetchPriceHistory
      // =======================================================================
      .addCase(fetchPriceHistory.fulfilled, (state, action) => {
        state.priceHistory = action.payload.history;
      })

      // =======================================================================
      // HANDLE: fetchDayChangeBasePrice
      // =======================================================================
      .addCase(fetchDayChangeBasePrice.fulfilled, (state, action) => {
        state.dayChangeBasePrice = action.payload.basePrice;
        state.dayChangeBaseDate = new Date().toDateString();
      })

      // =======================================================================
      // HANDLE: updateWalletInFirestore
      // =======================================================================
      .addCase(updateWalletInFirestore.fulfilled, (state, action) => {
        state.cashBalance = action.payload.cashBalance;
        state.tokenBalance = action.payload.tokenBalance;
      })

      // =======================================================================
      // HANDLE: buyTokens
      // =======================================================================
      .addCase(buyTokens.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(buyTokens.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cashBalance = action.payload.cashBalance;
        state.tokenBalance = action.payload.tokenBalance;
      })
      .addCase(buyTokens.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // =======================================================================
      // HANDLE: sellTokens
      // =======================================================================
      .addCase(sellTokens.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sellTokens.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cashBalance = action.payload.cashBalance;
        state.tokenBalance = action.payload.tokenBalance;
      })
      .addCase(sellTokens.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // =======================================================================
      // HANDLE: transferTokens
      // =======================================================================
      .addCase(transferTokens.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(transferTokens.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cashBalance = action.payload.cashBalance;
        state.tokenBalance = action.payload.tokenBalance;
      })
      .addCase(transferTokens.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // =======================================================================
      // HANDLE: claimEmergencyFunds
      // =======================================================================
      .addCase(claimEmergencyFunds.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(claimEmergencyFunds.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cashBalance = action.payload.cashBalance;
        state.tokenBalance = action.payload.tokenBalance;
      })
      .addCase(claimEmergencyFunds.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// ============================================================================
// EXPORT: Actions and Reducer
// ============================================================================
export const {
  setGoldPrice,
  updateWalletBalance,
  setInitialPortfolioValue,
  clearError,
} = walletSlice.actions;

export default walletSlice.reducer;

// ============================================================================
// SELECTORS: Computed values derived from state
// ============================================================================

// ----------------------------------------------------------------------------
// SELECTOR: selectPortfolioValue
// PURPOSE: Calculate total portfolio value
// FORMULA: cash + (tokens × current price)
// RETURNS: Total portfolio value in dollars
// ----------------------------------------------------------------------------
export const selectPortfolioValue = (state: { wallet: WalletState }) => {
  return (
    state.wallet.cashBalance +
    state.wallet.tokenBalance * state.wallet.currentGoldPrice
  );
};

// ----------------------------------------------------------------------------
// SELECTOR: selectProfitLoss
// PURPOSE: Calculate profit or loss from initial investment
// RETURNS: Object with value, percentage, and isPositive (for green/red color)
// ----------------------------------------------------------------------------
export const selectProfitLoss = (state: { wallet: WalletState }) => {
  // Current total value
  const currentValue = selectPortfolioValue(state);

  // What we started with
  const initialValue = state.wallet.initialPortfolioValue;

  // How much we made or lost
  const profitLoss = currentValue - initialValue;

  // Percentage gain/loss
  const percentage = initialValue > 0 ? (profitLoss / initialValue) * 100 : 0;

  return {
    value: profitLoss,
    percentage: percentage,
    isPositive: profitLoss >= 0, // true = green (profit), false = red (loss)
  };
};

// ----------------------------------------------------------------------------
// SELECTOR: selectDayChange
// PURPOSE: Calculate price change from START OF TODAY to current price
// RETURNS: Object with value, percentage, and isPositive
// NOTE: This is "Today's Change" - standard in professional trading apps
// ----------------------------------------------------------------------------
export const selectDayChange = (state: { wallet: WalletState }) => {
  const basePrice = state.wallet.dayChangeBasePrice;

  if (basePrice === null) {
    return { value: 0, percentage: 0, isPositive: true };
  }

  // Current price
  const newPrice = state.wallet.currentGoldPrice;

  // Calculate change
  const change = newPrice - basePrice;
  const percentage = basePrice > 0 ? (change / basePrice) * 100 : 0;

  return {
    value: change,
    percentage: percentage,
    isPositive: change >= 0,
  };
};

// ----------------------------------------------------------------------------
// SELECTOR: selectLastPriceChange
// PURPOSE: Calculate latest price movement from previous price to current price
// RETURNS: Object with value, percentage, and isPositive
// ----------------------------------------------------------------------------
export const selectLastPriceChange = (state: { wallet: WalletState }) => {
  const currentPrice = state.wallet.currentGoldPrice;
  const previousPrice = state.wallet.previousGoldPrice ?? currentPrice;
  const change = currentPrice - previousPrice;
  const percentage = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

  return {
    value: change,
    percentage: percentage,
    isPositive: change >= 0,
  };
};
