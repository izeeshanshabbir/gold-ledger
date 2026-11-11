import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import auth from '@react-native-firebase/auth';
import firestore, { FirestoreError } from '@react-native-firebase/firestore';

// Types
export interface User {
  uid: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const signupUser = createAsyncThunk(
  'auth/signup',
  async (
    { name, email, password }: { name: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );

      const uid = userCredential.user.uid;

      await userCredential.user.updateProfile({
        displayName: name,
      });

      // Create user document in Firestore with default values
      await firestore().collection('users').doc(uid).set({
        name,
        email,
        uid,
        cashBalance: 10000, // Default virtual cash
        tokenBalance: 0, // Initial token balance
      });

      return {
        uid,
        email,
        name,
      };
    } catch (error: any) {
      const err = error as FirestoreError;
      return rejectWithValue(err.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password
      );

      const user = userCredential.user;
      if (!user) {
        throw new Error('User not found');
      }

      return {
        uid: user.uid,
        email: user.email || email,
        name: user.displayName || '',
      };
    } catch (error: any) {
      const err = error as FirestoreError;
      return rejectWithValue(err.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await auth().signOut();
      return null;
    } catch (error: any) {
      const err = error as FirestoreError;
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Map Firebase auth error codes to messages that are safe to show a user.
 * The other thunks here surface raw err.message, which leaks Firebase internals.
 */
const describeDeleteError = (code: string, fallback: string): string => {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'That password is incorrect. Your account has not been deleted.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    case 'auth/user-token-expired':
    case 'auth/requires-recent-login':
      return 'Your session expired. Please log out, log back in, and try again.';
    default:
      return fallback || 'Could not delete your account. Please try again.';
  }
};

/**
 * Permanently delete the signed-in user.
 *
 * Order matters: Firestore data must go before the auth user, or the credential
 * needed to authorise those writes is gone before the data is.
 *
 * Reauthentication is the normal path, not an edge case — sessions here are
 * long-lived via redux-persist, so Firebase will almost always consider the
 * login stale and reject delete() with auth/requires-recent-login.
 */
export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async ({ password }: { password: string }, { rejectWithValue }) => {
    try {
      const currentUser = auth().currentUser;

      if (!currentUser || !currentUser.email) {
        return rejectWithValue('You are not signed in.');
      }

      const uid = currentUser.uid;

      // Step 1: prove the password before destroying anything
      const credential = auth.EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await currentUser.reauthenticateWithCredential(credential);

      // Step 2: delete the transactions subcollection. Deleting a document does
      // NOT delete its subcollections, so these must be paged out explicitly.
      const transactionsRef = firestore()
        .collection('users')
        .doc(uid)
        .collection('transactions');

      while (true) {
        const snapshot = await transactionsRef.limit(400).get();

        if (snapshot.empty) {
          break;
        }

        const batch = firestore().batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // A full page means there may be more; a short page means that was the last.
        if (snapshot.size < 400) {
          break;
        }
      }

      // Step 3: the wallet document itself
      await firestore().collection('users').doc(uid).delete();

      // Step 4: finally the auth user
      await currentUser.delete();

      return null;
    } catch (error: any) {
      return rejectWithValue(describeDeleteError(error?.code, error?.message));
    }
  }
);

export const checkAuthState = createAsyncThunk(
  'auth/checkState',
  async (_, { rejectWithValue }) => {
    try {
      const user = auth().currentUser;
      if (user) {
        return {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || '',
        };
      }
      return null;
    } catch (error: any) {
      const err = error as FirestoreError;
      return rejectWithValue(err.message);
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Signup
      .addCase(signupUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Login
      .addCase(loginUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.pending, state => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete account
      .addCase(deleteAccount.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, state => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Check Auth State
      .addCase(checkAuthState.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        } else {
          state.user = null;
          state.isAuthenticated = false;
        }
        state.isLoading = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
