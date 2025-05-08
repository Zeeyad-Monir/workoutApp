import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  auth,
  db,
} from '../firebase';                   // updateProfile is re‑exported below
import { doc, setDoc } from 'firebase/firestore';

export default function SignUpScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [pass1,    setPass1]    = useState('');
  const [pass2,    setPass2]    = useState('');
  const [error,    setError]    = useState('');

  const handleSignUp = async () => {
    if (pass1 !== pass2) {
      setError('Passwords do not match');
      return;
    }
    try {
      // 1) create Auth account
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass1);

      // 2) save username on Auth profile
      await updateProfile(cred.user, { displayName: username.trim() });

      // 3) create initial Firestore user doc
      await setDoc(doc(db, 'users', cred.user.uid), {
        username: username.trim(),
        handle: username.trim().replace(/\s+/g, '').toLowerCase(),
        favouriteWorkout: '',
        wins: 0,
        totals: 0,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <Text style={styles.logo}>CompFit</Text>
      <Text style={styles.tagline}>Compete with your friends</Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Username"
          placeholderTextColor="#6B7280"
          style={styles.input}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor="#6B7280"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#6B7280"
          style={styles.input}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          value={pass1}
          onChangeText={setPass1}
        />

        <TextInput
          placeholder="Repeat Password"
          placeholderTextColor="#6B7280"
          style={styles.input}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          value={pass2}
          onChangeText={setPass2}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleSignUp}>
          <Text style={styles.btnText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 18 }}>
          <Text style={styles.switchText}>
            Have an Account? <Text style={styles.switchLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* styling identical to before */
const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#2E3439', alignItems: 'center' },
  logo:      { fontSize: 52, fontWeight: '900', color: '#A4D65E', marginTop: 80 },
  tagline:   { fontSize: 20, color: '#FFF', marginTop: 12, marginBottom: 60 },
  form:      { width: '80%' },
  input:     {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    fontSize: 16, marginBottom: 20,
  },
  btn:       {
    backgroundColor: '#A4D65E', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 10,
  },
  btnText:   { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  switchText:{ color: '#FFF', textAlign: 'center', fontSize: 14 },
  switchLink:{ color: '#A4D65E', fontWeight: '600' },
  error:     { color: '#F87171', textAlign: 'center', marginBottom: 10 },
});