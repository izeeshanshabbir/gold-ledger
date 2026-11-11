import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import firestore from '@react-native-firebase/firestore';

// Types
export type TransactionType = 'BUY' | 'SELL' | 'TRANSFER';

export interface Transaction {
  id: string;
  type: TransactionType;
  tokens: number;
  pricePerToken: number;
  totalValue: number;
  timestamp: Date;
  senderId?: string;
  receiverId?: string;
  receiverEmail?: string;
}

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  filter: TransactionType | 'ALL';
}

const initialState: TransactionState = {
  transactions: [],
  isLoading: false,
  error: null,
  filter: 'ALL',
};

// Async thunks
export const addTransaction = createAsyncThunk(
  'transactions/add',
  async (
    {
      uid,
      transaction,
    }: { uid: string; transaction: Omit<Transaction, 'id' | 'timestamp'> },
    { rejectWithValue }
  ) => {
    try {
      const transactionRef = await firestore()
        .collection('users')
        .doc(uid)
        .collection('transactions')
        .add({
          ...transaction,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

      return {
        id: transactionRef.id,
        ...transaction,
        timestamp: new Date(),
      } as Transaction;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'transactions/fetch',
  async (uid: string, { rejectWithValue }) => {
    try {
      const snapshot = await firestore()
        .collection('users')
        .doc(uid)
        .collection('transactions')
        .orderBy('timestamp', 'desc')
        .get();

      const transactions: Transaction[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          tokens: data.tokens,
          pricePerToken: data.pricePerToken,
          totalValue: data.totalValue,
          timestamp: data.timestamp?.toDate() || new Date(),
          senderId: data.senderId,
          receiverId: data.receiverId,
          receiverEmail: data.receiverEmail,
        } as Transaction;
      });

      return transactions;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const listenToTransactions = createAsyncThunk(
  'transactions/listen',
  async (uid: string, { dispatch }) => {
    firestore()
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .orderBy('timestamp', 'desc')
      .onSnapshot(snapshot => {
        const transactions: Transaction[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: data.type,
            tokens: data.tokens,
            pricePerToken: data.pricePerToken,
            totalValue: data.totalValue,
            timestamp: data.timestamp?.toDate() || new Date(),
            senderId: data.senderId,
            receiverId: data.receiverId,
            receiverEmail: data.receiverEmail,
          } as Transaction;
        });
        dispatch(setTransactions(transactions));
      });
  }
);

// Slice
const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = action.payload;
    },
    setFilter: (state, action: PayloadAction<TransactionType | 'ALL'>) => {
      state.filter = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Add Transaction
      .addCase(addTransaction.pending, state => {
        state.isLoading = true;
      })
      .addCase(addTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions.unshift(action.payload);
      })
      .addCase(addTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Transactions
      .addCase(fetchTransactions.pending, state => {
        state.isLoading = true;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setTransactions, setFilter, clearError } = transactionSlice.actions;

// Selector for filtered transactions
export const selectFilteredTransactions = (state: {
  transactions: TransactionState;
}) => {
  const { transactions, filter } = state.transactions;
  if (filter === 'ALL') {
    return transactions;
  }
  return transactions.filter(t => t.type === filter);
};

export default transactionSlice.reducer;
