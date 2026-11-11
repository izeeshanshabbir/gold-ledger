import firestore from '@react-native-firebase/firestore';

/**
 * ============================================================================
 * WALLET SERVICE
 * ============================================================================
 *
 * PURPOSE: Handle all wallet-related database operations
 *
 * RESPONSIBILITIES:
 * - Read user wallet data (cash, tokens)
 * - Update user wallet in Firestore
 * - Real-time wallet balance updates
 * - User validation (for transfers in Milestone 3)
 * - Transaction recording and history (for Milestone 3 & 4)
 *
 * FIREBASE STRUCTURE:
 * users/{uid}
 *   ├── cashBalance: number (default: 10000)
 *   ├── tokenBalance: number (default: 0)
 *   ├── email: string
 *   ├── updatedAt: timestamp
 *   └── transactions/{autoId}
 *       ├── type: "BUY" | "SELL" | "TRANSFER"
 *       ├── tokens: number
 *       ├── pricePerToken: number
 *       ├── totalValue: number
 *       └── timestamp: timestamp
 * ============================================================================
 */

// ============================================================================
// CLASS: WalletService
// Singleton pattern - only one instance exists
// ============================================================================
class WalletService {
  // -------------------------------------------------------------------------
  // METHOD: getUserWallet
  // PURPOSE: Get a user's current wallet balance from Firestore
  // PARAMS: uid - User ID
  // RETURNS: Promise with cashBalance and tokenBalance
  // Firebase calls: 1 read
  // -------------------------------------------------------------------------
  async getUserWallet(uid: string): Promise<{
    cashBalance: number;
    tokenBalance: number;
  }> {
    // Get the user document from Firestore
    const userDoc = await firestore().collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userDoc.exists) {
      return {
        cashBalance: 10000,
        tokenBalance: 0,
      };
    }

    // Return balances with defaults if they don't exist
    return {
      cashBalance: userData?.cashBalance ?? 10000,
      tokenBalance: userData?.tokenBalance ?? 0,
    };
  }

  // -------------------------------------------------------------------------
  // METHOD: updateUserWallet
  // PURPOSE: Save new wallet balances to Firestore
  // PARAMS:
  //   uid - User ID
  //   updates - Object with cashBalance and/or tokenBalance
  // Firebase calls: 1 write
  // -------------------------------------------------------------------------
  async updateUserWallet(
    uid: string,
    updates: {
      cashBalance?: number;
      tokenBalance?: number;
    }
  ): Promise<void> {
    // Update the user document with new balances
    // update() only changes specified fields, preserves others
    await firestore().collection('users').doc(uid).update({
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(), // Track when updated
    });
  }

  async addEmergencyFunds(
    uid: string,
    amount: number = 10000
  ): Promise<{ cashBalance: number; tokenBalance: number }> {
    const userRef = firestore().collection('users').doc(uid);

    return firestore().runTransaction(async transaction => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('Wallet not found');
      }

      const userData = userDoc.data();
      const currentCashBalance = userData?.cashBalance ?? 10000;
      const currentTokenBalance = userData?.tokenBalance ?? 0;
      const newCashBalance = currentCashBalance + amount;

      transaction.update(userRef, {
        cashBalance: newCashBalance,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      return {
        cashBalance: newCashBalance,
        tokenBalance: currentTokenBalance,
      };
    });
  }

  // -------------------------------------------------------------------------
  // METHOD: subscribeToWallet
  // PURPOSE: Listen for real-time changes to user's wallet
  // PARAMS:
  //   uid - User ID
  //   callback - Function to call when wallet changes
  // RETURNS: Unsubscribe function (call to stop listening)
  // Firebase calls: 1 read initially, then triggered on changes
  // -------------------------------------------------------------------------
  subscribeToWallet(
    uid: string,
    callback: (data: { cashBalance: number; tokenBalance: number }) => void
  ): () => void {
    // onSnapshot listens for changes in real-time
    const unsubscribe = firestore()
      .collection('users')
      .doc(uid)
      .onSnapshot(doc => {
        const data = doc.data();

        // Only call callback if data exists
        if (data) {
          callback({
            cashBalance: data.cashBalance ?? 10000,
            tokenBalance: data.tokenBalance ?? 0,
          });
        }
      });

    // Return function to stop listening
    return unsubscribe;
  }

  // -------------------------------------------------------------------------
  // METHOD: getCurrentGoldPrice
  // PURPOSE: Get current gold price from market data
  // NOTE: This is a fallback - priceService.getCurrentPrice() is preferred
  // RETURNS: Promise<number> - Current gold price
  // Firebase calls: 1 read
  // -------------------------------------------------------------------------
  async getCurrentGoldPrice(): Promise<number> {
    const doc = await firestore().collection('market').doc('gold').get();
    const data = doc.data();
    return data?.price || 65.5;
  }

  // -------------------------------------------------------------------------
  // METHOD: userExists
  // PURPOSE: Check if a user with given email exists
  // USE CASE: Validating recipient for token transfers (Milestone 3)
  // PARAMS: email - Email address to check
  // RETURNS: Promise<boolean> - true if user exists
  // Firebase calls: 1 read (with where clause)
  // -------------------------------------------------------------------------
  async userExists(email: string): Promise<boolean> {
    // Query users collection for email match
    const snapshot = await firestore()
      .collection('users')
      .where('email', '==', email)
      .limit(1) // Only need to know if at least one exists
      .get();

    // If snapshot is not empty, user exists
    return !snapshot.empty;
  }

  // -------------------------------------------------------------------------
  // METHOD: getUserIdByEmail
  // PURPOSE: Get user ID from email address
  // USE CASE: Getting recipient's UID for transfers (Milestone 3)
  // PARAMS: email - Email address to look up
  // RETURNS: Promise<string | null> - User ID or null if not found
  // Firebase calls: 1 read (with where clause)
  // -------------------------------------------------------------------------
  async getUserIdByEmail(email: string): Promise<string | null> {
    // Query users collection for email match
    const snapshot = await firestore()
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    // If no user found, return null
    if (snapshot.empty) {
      return null;
    }

    // Return the document ID (which is the UID)
    return snapshot.docs[0].id;
  }

  // -------------------------------------------------------------------------
  // METHOD: recordTransaction
  // PURPOSE: Save a transaction record to user's transaction history
  // USE CASE: After buy, sell, or transfer operations (Milestone 3)
  // PARAMS:
  //   uid - User ID
  //   transaction - Transaction details object
  // Firebase calls: 1 write
  // -------------------------------------------------------------------------
  async recordTransaction(
    uid: string,
    transaction: {
      type: 'BUY' | 'SELL' | 'TRANSFER';
      tokens: number;
      pricePerToken: number;
      totalValue: number;
      senderId?: string;      // For transfers: sender's UID
      receiverId?: string;    // For transfers: receiver's UID
      receiverEmail?: string; // For transfers: receiver's email
    }
  ): Promise<void> {
    // Add transaction to user's transaction subcollection
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .add({
        ...transaction,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
  }

  // -------------------------------------------------------------------------
  // METHOD: transferTokensAtomic
  // PURPOSE: Transfer tokens and write both transaction records atomically
  // PARAMS:
  //   senderId - Sender's User ID
  //   receiverId - Recipient's User ID
  //   receiverEmail - Recipient's email address
  //   tokenAmount - Tokens to transfer
  //   pricePerToken - Current gold price
  // RETURNS: Promise with updated sender balances
  // Firebase calls: 2 reads + 4 writes in a single transaction
  // -------------------------------------------------------------------------
  async transferTokensAtomic({
    senderId,
    receiverId,
    receiverEmail,
    tokenAmount,
    pricePerToken,
  }: {
    senderId: string;
    receiverId: string;
    receiverEmail: string;
    tokenAmount: number;
    pricePerToken: number;
  }): Promise<{ cashBalance: number; tokenBalance: number }> {
    const usersCollection = firestore().collection('users');
    const senderRef = usersCollection.doc(senderId);
    const receiverRef = usersCollection.doc(receiverId);
    const senderTransactionRef = senderRef.collection('transactions').doc();
    const receiverTransactionRef = receiverRef.collection('transactions').doc();
    const totalValue = tokenAmount * pricePerToken;

    return firestore().runTransaction(async transaction => {
      const [senderDoc, receiverDoc] = await Promise.all([
        transaction.get(senderRef),
        transaction.get(receiverRef),
      ]);

      if (!senderDoc.exists) {
        throw new Error('Sender wallet not found');
      }

      if (!receiverDoc.exists) {
        throw new Error('Recipient not found');
      }

      const senderData = senderDoc.data();
      const receiverData = receiverDoc.data();
      const senderCashBalance = senderData?.cashBalance ?? 10000;
      const senderTokenBalance = senderData?.tokenBalance ?? 0;
      const receiverTokenBalance = receiverData?.tokenBalance ?? 0;

      if (senderTokenBalance < tokenAmount) {
        throw new Error('Insufficient token balance');
      }

      const newSenderTokenBalance = senderTokenBalance - tokenAmount;
      const newReceiverTokenBalance = receiverTokenBalance + tokenAmount;
      const updatedAt = firestore.FieldValue.serverTimestamp();
      const timestamp = firestore.FieldValue.serverTimestamp();

      transaction.update(senderRef, {
        tokenBalance: newSenderTokenBalance,
        updatedAt,
      });
      transaction.update(receiverRef, {
        tokenBalance: newReceiverTokenBalance,
        updatedAt,
      });

      transaction.set(senderTransactionRef, {
        type: 'TRANSFER',
        tokens: tokenAmount,
        pricePerToken,
        totalValue,
        senderId,
        receiverId,
        receiverEmail,
        timestamp,
      });
      transaction.set(receiverTransactionRef, {
        type: 'TRANSFER',
        tokens: tokenAmount,
        pricePerToken,
        totalValue,
        senderId,
        receiverId,
        timestamp,
      });

      return {
        cashBalance: senderCashBalance,
        tokenBalance: newSenderTokenBalance,
      };
    });
  }

  // -------------------------------------------------------------------------
  // METHOD: getTransactionHistory
  // PURPOSE: Get user's transaction history
  // USE CASE: Displaying transaction list (Milestone 4)
  // PARAMS:
  //   uid - User ID
  //   limit - Maximum number of transactions to return (default: 50)
  // RETURNS: Promise<Array> - List of transactions
  // Firebase calls: 1 read
  // -------------------------------------------------------------------------
  async getTransactionHistory(
    uid: string,
    limit: number = 50
  ): Promise<
    Array<{
      id: string;
      type: string;
      tokens: number;
      pricePerToken: number;
      totalValue: number;
      timestamp: Date;
      senderId?: string;
      receiverId?: string;
      receiverEmail?: string;
    }>
  > {
    // Get transactions ordered by newest first
    const snapshot = await firestore()
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .orderBy('timestamp', 'desc') // Newest first
      .limit(limit)
      .get();

    // Convert Firestore documents to plain objects
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as any;
  }

  // -------------------------------------------------------------------------
  // METHOD: subscribeToTransactions
  // PURPOSE: Listen for real-time transaction updates
  // USE CASE: Live transaction feed (Milestone 4)
  // PARAMS:
  //   uid - User ID
  //   callback - Function to call when transactions change
  // RETURNS: Unsubscribe function
  // Firebase calls: 1 read initially, then triggered on changes
  // -------------------------------------------------------------------------
  subscribeToTransactions(
    uid: string,
    callback: (transactions: any[]) => void
  ): () => void {
    // Listen to transaction collection changes
    const unsubscribe = firestore()
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        // Convert documents to objects and call callback
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));
        callback(transactions);
      });

    // Return function to stop listening
    return unsubscribe;
  }
}

// ============================================================================
// EXPORT: Singleton instance
// ============================================================================
export const walletService = new WalletService();
