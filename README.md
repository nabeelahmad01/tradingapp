# Trading App (React Web)

A responsive React app with Redux, React Router, Ant Design UI, and Firebase placeholders. Includes user flows (Login/Signup, Deposit, Withdraw, History, News, Instructions) and admin area (Dashboard, Deposits, Withdrawals, News).

## Setup

1) Install dependencies
```
cd web
npm install
```

2) Configure Firebase
- Copy `.env.example` to `.env` and fill your Firebase web config.
- In Firebase Console enable: Authentication (Email/Password; Phone optional), Firestore, Storage.

3) Run dev server
```
npm run dev
```

## Firebase Wiring (to implement)
- Replace TODOs in:
  - `src/pages/Login.jsx` (signInWithEmailAndPassword)
  - `src/pages/Signup.jsx` (createUserWithEmailAndPassword)
  - `src/pages/Deposit.jsx` (upload to Storage, write Firestore `deposits`)
  - `src/pages/Withdraw.jsx` (write Firestore `withdrawals`)
  - Admin pages to read/write Firestore and approve/reject.
- Save user role (`user`/`admin`) in `users/{uid}` document or custom claims.

## Suggested Firestore Structure
- `users/{uid}`: { email, phoneNumber, role: 'user'|'admin', balance: number, createdAt }
- `deposits/{id}`: { uid, amount, txId, screenshotUrl, status: 'pending'|'approved'|'rejected', createdAt, reviewedAt, reviewerId }
- `withdrawals/{id}`: { uid, amount, method, status, createdAt, reviewedAt, reviewerId }
- `news/{id}`: { title, body, createdAt }
- Optional `notifications/{id}` for admin/user.

## Firestore Rules (example)
See `firestore.rules` for a starting point. Deploy via Firebase CLI.

## Notes
- UI uses Ant Design 5 (mobile responsive).
- Routing and guards in `src/routes/`.
- Redux auth slice stores minimal user object; connect it to Firebase Auth state.
