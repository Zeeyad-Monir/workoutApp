import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { signInWithEmailAndPassword, auth } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // `username` can be looked up later if needed
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
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={{ marginTop: 18 }}>
          <Text style={styles.switchText}>
            Don’t have an Account? <Text style={styles.switchLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.socialHeading}>or sign up with</Text>

        <View style={styles.socialRow}>
          <Ionicons name="logo-google"   size={32} color="#A4D65E" style={styles.socialIcon} />
          <Ionicons name="logo-facebook" size={32} color="#A4D65E" style={styles.socialIcon} />
          <Ionicons name="finger-print"  size={32} color="#A4D65E" style={styles.socialIcon} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  /* —‑‑‑ identical styles kept —‑‑‑ */
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
  socialHeading:{ color: '#FFF', textAlign: 'center', marginVertical: 20 },
  socialRow: { flexDirection: 'row', justifyContent: 'center' },
  socialIcon:{ marginHorizontal: 14 },
  error:     { color: '#F87171', textAlign: 'center', marginBottom: 10 },
});