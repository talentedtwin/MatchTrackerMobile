import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../config/constants';
import api from '../services/api';

/**
 * Network Diagnostics Screen
 * Add this to your navigation temporarily to debug API issues
 */
const NetworkDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState({
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    healthCheck: null,
    error: null,
    timestamp: null,
  });

  const runDiagnostics = async () => {
    setDiagnostics(prev => ({ ...prev, error: null, timestamp: new Date().toISOString() }));
    
    try {
      console.log('Running network diagnostics...');
      console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
      
      // Test health endpoint
      const health = await api.get('/health');
      console.log('Health check response:', health);
      
      setDiagnostics(prev => ({
        ...prev,
        healthCheck: health,
        error: null,
      }));
    } catch (error) {
      console.error('Diagnostic error:', error);
      setDiagnostics(prev => ({
        ...prev,
        healthCheck: null,
        error: {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
        },
      }));
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Network Diagnostics</Text>
        <Text style={styles.subtitle}>Last run: {diagnostics.timestamp || 'Not run yet'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>API URL:</Text>
          <Text style={styles.value}>{diagnostics.apiUrl || 'Not set'}</Text>
        </View>
      </View>

      {diagnostics.healthCheck && (
        <View style={[styles.section, styles.successSection]}>
          <Text style={styles.sectionTitle}>✅ Health Check: Success</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{diagnostics.healthCheck.status}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Database:</Text>
            <Text style={styles.value}>
              {diagnostics.healthCheck.database?.status || 'Unknown'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Environment:</Text>
            <Text style={styles.value}>{diagnostics.healthCheck.environment}</Text>
          </View>
        </View>
      )}

      {diagnostics.error && (
        <View style={[styles.section, styles.errorSection]}>
          <Text style={styles.sectionTitle}>❌ Error</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Message:</Text>
            <Text style={styles.errorText}>{diagnostics.error.message}</Text>
          </View>
          {diagnostics.error.code && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Code:</Text>
              <Text style={styles.errorText}>{diagnostics.error.code}</Text>
            </View>
          )}
          {diagnostics.error.status && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.errorText}>{diagnostics.error.status}</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={runDiagnostics}>
        <Text style={styles.buttonText}>Run Diagnostics Again</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Common Issues</Text>
        <Text style={styles.helpText}>
          • <Text style={styles.bold}>Network Error:</Text> Backend not running or wrong IP address{'\n'}
          • <Text style={styles.bold}>Timeout:</Text> Firewall blocking connection{'\n'}
          • <Text style={styles.bold}>404:</Text> Wrong API endpoint{'\n'}
          • <Text style={styles.bold}>401/403:</Text> Authentication issue
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  successSection: {
    backgroundColor: '#e8f5e9',
  },
  errorSection: {
    backgroundColor: '#ffebee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  infoRow: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
});

export default NetworkDiagnostics;
