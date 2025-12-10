import React, {useState} from 'react';
import {View, StyleSheet, Image} from 'react-native';
import {Button, Surface, Text, TextInput, useTheme} from 'react-native-paper';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const theme = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Surface style={[styles.card, {backgroundColor: theme.colors.surface}]} elevation={5}>
        <Image
          source={{uri: 'https://lira365.com/images/logo.png'}}
          style={styles.logo}
        />
        <Text variant="headlineMedium" style={[styles.title, {color: theme.colors.onSurface}]}>LIRA</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>AI Simulation Platform</Text>
        <TextInput
          label="이메일"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          mode="outlined"
          secureTextEntry
        />
        <Button
          mode="contained"
          onPress={() => console.log('Login Pressed')}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}>
          로그인
        </Button>
        <View style={styles.helpRow}>
          <Button onPress={() => console.log('Find password')} compact textColor={theme.colors.onSurfaceVariant}>
            비밀번호 찾기
          </Button>
          <Button onPress={() => console.log('Sign up')} compact textColor={theme.colors.onSurfaceVariant}>
            회원가입
          </Button>
        </View>
        <View style={styles.divider}>
          <View style={[styles.line, {backgroundColor: theme.colors.surfaceVariant}]} />
          <Text style={[styles.dividerText, {color: theme.colors.onSurfaceVariant}]}>또는</Text>
          <View style={[styles.line, {backgroundColor: theme.colors.surfaceVariant}]} />
        </View>
        <Button
          mode="contained"
          onPress={() => console.log('Kakao Login')}
          style={styles.kakaoButton}
          textColor="#3C1E1E"
          buttonColor="#FEE500">
          카카오로 계속하기
        </Button>
        <Button
          mode="outlined"
          onPress={() => console.log('Google Login')}
          style={styles.socialButton}
          textColor={theme.colors.onSurface}
          icon="google">
          Google 계정으로 계속하기
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  logo: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 16,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  helpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    letterSpacing: 1,
  },
  line: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  kakaoButton: {
    marginTop: 8,
    borderRadius: 16,
  },
  socialButton: {
    marginTop: 8,
    borderRadius: 16,
    borderColor: '#3A6FF7',
  },
});

export default LoginScreen;
