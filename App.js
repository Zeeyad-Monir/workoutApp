import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator   from './src/navigation/AppNavigator';
import AuthNavigator  from './src/navigation/AuthNavigator';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}

function Root() {
  const { user } = useContext(AuthContext);
  return user ? <AppNavigator /> : <AuthNavigator />;
}