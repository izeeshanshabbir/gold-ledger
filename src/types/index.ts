import { AuthState } from '../store/slices/authSlice';
import { WalletState } from '../store/slices/walletSlice';
import { TransactionState } from '../store/slices/transactionSlice';

export interface RootState {
  auth: AuthState;
  wallet: WalletState;
  transactions: TransactionState;
}

export type { Transaction, TransactionType } from '../store/slices/transactionSlice';
export type { User } from '../store/slices/authSlice';
