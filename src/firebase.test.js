jest.mock('firebase/app', () => {
  const actual = jest.requireActual('firebase/app');
  return {
    ...actual,
    initializeApp: jest.fn((config, name) => ({ config, name: name || 'default' })),
    getApps: jest.fn(() => []),
  };
});

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn((app) => ({ appName: app.name })),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'timestamp'),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
}));

describe('createFirebaseUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_FIREBASE_API_KEY = 'test-api-key';
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    process.env.REACT_APP_FIREBASE_PROJECT_ID = 'test-project';
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = '123';
    process.env.REACT_APP_FIREBASE_APP_ID = '1:test:web:test';
  });

  it('creates users through an isolated auth instance so the admin session stays intact', async () => {
    const { createUserWithEmailAndPassword } = require('firebase/auth');
    createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: '123', email: 'new.user@example.com' } });

    const { createFirebaseUser } = require('./firebase');
    await createFirebaseUser('new.user@example.com', 'Temp@12345');

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'user-creation' }),
      'new.user@example.com',
      'Temp@12345'
    );
  });
});
