import admin from "firebase-admin";

function getServiceAccountFromEnv():
  | {
      projectId: string;
      clientEmail: string;
      privateKey: string;
    }
  | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch {
      // ignore
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (projectId && clientEmail && privateKeyRaw) {
    // Common pattern: private key passed with literal "\n"
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

export function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.app();

  const serviceAccount = getServiceAccountFromEnv();
  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  // Falls back to Application Default Credentials if available (e.g. GOOGLE_APPLICATION_CREDENTIALS)
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}


