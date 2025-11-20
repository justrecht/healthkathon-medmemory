import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import * as React from "react";
import { auth, db } from "../config/firebase";
WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "<EXPO_CLIENT_ID>",
    iosClientId: "<IOS_CLIENT_ID>",
    androidClientId: "<ANDROID_CLIENT_ID>",
    webClientId: "<WEB_CLIENT_ID>",
    scopes: ["profile", "email"],
  });

  React.useEffect(() => {
    const handle = async () => {
      if (response?.type === "success") {
        const { authentication } = response;
        if (!authentication) return;
        const { idToken, accessToken } = authentication;
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        const userCred = await signInWithCredential(auth, credential);
        const u = userCred.user;
        // Simpan / update profile di Firestore
        await setDoc(
          doc(db, "users", u.uid),
          {
            uid: u.uid,
            email: u.email,
            name: u.displayName,
            photoURL: u.photoURL,
            lastLogin: new Date(),
          },
          { merge: true }
        );
      }
    };
    handle();
  }, [response]);

  return { promptAsync, request, response };
}