import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors, spacing } from '../utils/theme';
import { ContactRequestService, ContactRequest } from '../utils/contactRequests';

const { width: screenWidth } = Dimensions.get('window');

interface Props {
  onRequestsUpdated?: () => void;
}

export default function FloatingContactRequests({ onRequestsUpdated }: Props) {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRequests = async () => {
    try {
      const contactService = ContactRequestService.getInstance();
      const pendingRequests = await contactService.getPendingRequests();
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Failed to load contact requests:', error);
    }
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptRequest = async (request: ContactRequest, index: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const contactService = ContactRequestService.getInstance();
      const success = await contactService.acceptContactRequest(request.id);

      if (success) {
        setRequests(prev => prev.filter(req => req.id !== request.id));
        onRequestsUpdated?.();
        
        setTimeout(() => {
          Alert.alert('Contact Added', `PIN ${request.fromPin} added to contacts`, [{ text: 'OK' }]);
        }, 200);
      } else {
        Alert.alert('Error', 'Failed to accept request');
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async (request: ContactRequest, index: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const contactService = ContactRequestService.getInstance();
      const success = await contactService.rejectContactRequest(request.id);

      if (success) {
        setRequests(prev => prev.filter(req => req.id !== request.id));
        onRequestsUpdated?.();
      } else {
        Alert.alert('Error', 'Failed to reject request');
      }
    } catch (error) {
      console.error('Failed to reject request:', error);
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    return date.toLocaleDateString();
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {requests.map((request, index) => (
        <ContactRequestCard
          key={request.id}
          request={request}
          index={index}
          totalCount={requests.length}
          onAccept={() => handleAcceptRequest(request, index)}
          onReject={() => handleRejectRequest(request, index)}
          formatTimestamp={formatTimestamp}
          isProcessing={isProcessing}
        />
      ))}
    </View>
  );
}

interface CardProps {
  request: ContactRequest;
  index: number;
  totalCount: number;
  onAccept: () => void;
  onReject: () => void;
  formatTimestamp: (timestamp: number) => string;
  isProcessing: boolean;
}

function ContactRequestCard({ 
  request, 
  index, 
  totalCount, 
  onAccept, 
  onReject, 
  formatTimestamp,
  isProcessing 
}: CardProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Subtle stacking - much smaller offset
  const stackOffset = index * 4;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
      ],
      opacity: opacity.value,
      zIndex: totalCount - index,
      marginBottom: stackOffset,
    };
  });

  const handleAcceptWithAnimation = () => {
    translateX.value = withSpring(screenWidth * 0.3, { damping: 20 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onAccept)();
    });
  };

  const handleRejectWithAnimation = () => {
    translateX.value = withSpring(-screenWidth * 0.3, { damping: 20 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onReject)();
    });
  };

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View style={styles.pinBadge}>
            <Text style={styles.pinText}>{request.fromPin}</Text>
          </View>
          <View style={styles.textSection}>
            <Text style={styles.requestText}>Contact Request</Text>
            <Text style={styles.timeText}>{formatTimestamp(request.timestamp)}</Text>
          </View>
        </View>
        
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleRejectWithAnimation}
            disabled={isProcessing}
          >
            <Text style={styles.rejectText}>✕</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAcceptWithAnimation}
            disabled={isProcessing}
          >
            <Text style={styles.acceptText}>✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    zIndex: 1000,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinBadge: {
    backgroundColor: colors.button,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.sm,
  },
  pinText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'SF Mono',
  },
  textSection: {
    flex: 1,
  },
  requestText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  buttonSection: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  rejectButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  acceptButton: {
    backgroundColor: colors.button,
    borderColor: colors.border,
  },
  rejectText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  acceptText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 