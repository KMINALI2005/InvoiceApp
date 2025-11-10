// src/components/ErrorBoundary.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Icon name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.title}>حدث خطأ غير متوقع</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'خطأ غير معروف'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.buttonText}>المحاولة مرة أخرى</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#134e4a',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d9488',
    padding: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
