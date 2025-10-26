import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import { COLORS, FONTS } from '../config/constants';

// Required for OAuth on mobile
WebBrowser.maybeCompleteAuthSession();

// Warm up the browser for faster OAuth on iOS
const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

const SignInScreen = ({ navigation }) => {
  useWarmUpBrowser(); // Add browser warm up
  
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });
  const { startOAuthFlow: startFacebookOAuth } = useOAuth({ strategy: 'oauth_facebook' });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!isLoaded) return;

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Navigation will happen automatically via AppNavigator
      } else {
        // Handle other statuses (verification needed, etc.)
        console.log('Sign in result:', result);
        Alert.alert('Error', 'Sign in incomplete. Please try again.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', error.errors?.[0]?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider) => {
    try {
      setLoading(true);
      
      let startOAuth;
      if (provider === 'Google') startOAuth = startGoogleOAuth;
      else if (provider === 'Apple') startOAuth = startAppleOAuth;
      else if (provider === 'Facebook') startOAuth = startFacebookOAuth;
      
      const { createdSessionId, setActive: setActiveSession } = await startOAuth();
      
      if (createdSessionId) {
        await setActiveSession({ session: createdSessionId });
        // Navigation will happen automatically
      }
    } catch (error) {
      console.error('OAuth error:', error);
      Alert.alert(
        `${provider} Sign-In`,
        error.errors?.[0]?.message || `${provider} OAuth is not configured in your Clerk dashboard. Please use email/password for now.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>MatchTracker</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('SignUp')}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialSignIn('Google')}
              disabled={loading}
            >
              <AntDesign name="google" size={20} color="#DB4437" style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.appleSocialButton]}
              onPress={() => handleSocialSignIn('Apple')}
              disabled={loading}
            >
              <AntDesign name="apple" size={20} color="#fff" style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, styles.appleSocialButtonText]}>Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.facebookSocialButton]}
              onPress={() => handleSocialSignIn('Facebook')}
              disabled={loading}
            >
              <FontAwesome name="facebook" size={20} color="#fff" style={styles.socialIcon} />
              <Text style={[styles.socialButtonText, styles.facebookSocialButtonText]}>Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            � Connected to Clerk backend for secure authentication
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontFamily: FONTS.heading,
    color: COLORS.primary,
    marginBottom: 5,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    fontFamily: FONTS.body,
    borderWidth: 1,
    borderColor: COLORS.gray?.[300] || '#ddd',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  linkTextBold: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
  },
  infoBox: {
    marginTop: 30,
    padding: 15,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray?.[300] || '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.gray?.[300] || '#ddd',
  },
  socialIcon: {
    marginRight: 8,
  },
  appleSocialButton: {
    backgroundColor: '#000',
  },
  facebookSocialButton: {
    backgroundColor: '#1877F2',
  },
  socialButtonText: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text,
  },
  appleSocialButtonText: {
    color: '#fff',
  },
  facebookSocialButtonText: {
    color: '#fff',
  },
});

export default SignInScreen;
