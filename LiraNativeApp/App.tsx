import React from 'react';
import {PaperProvider} from 'react-native-paper';
import LoginScreen from './src/screens/LoginScreen';
import {liraTheme} from './src/core/theme';

function App(): React.JSX.Element {
  return (
    <PaperProvider theme={liraTheme}>
      <LoginScreen />
    </PaperProvider>
  );
}

export default App;

